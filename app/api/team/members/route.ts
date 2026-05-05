import { logger } from '@/lib/logger';

export async function PUT(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
    });

    if (!currentMember || currentMember.role !== 'owner') {
      logger.warn('Unauthorized role update attempt', { 
        userId: user.id, 
        teamId: currentMember?.teamId 
      });
      return NextResponse.json({ error: 'Only owners can manage roles' }, { status: 403 });
    }

    const payload = await request.json();
    const { memberId, role, permissions } = payload as {
      memberId: number;
      role: TeamRole;
      permissions?: MemberPermissions;
    };

    if (!memberId || !role) {
      return NextResponse.json({ error: 'memberId and role are required' }, { status: 400 });
    }

    if (!['owner', 'admin', 'agent'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const targetMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.id, memberId),
        eq(teamMembers.teamId, currentMember.teamId)
      ),
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (targetMember.userId === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    const finalPermissions = role === 'owner'
      ? null
      : (permissions || ROLE_PRESETS[role]);

    await db.update(teamMembers)
      .set({ role, permissions: finalPermissions })
      .where(eq(teamMembers.id, memberId));

    logger.info('Member role updated', {
      memberId,
      newRole: role,
      updatedBy: user.id
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error updating member role', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

