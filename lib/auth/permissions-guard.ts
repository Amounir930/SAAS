import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { 
  hasPermission, 
  canSeeAllChats, 
  getChatVisibility, 
  getPermissions, 
  type PermissionResource, 
  type MemberPermissions, 
  type ChatVisibility 
} from '@/lib/permissions';

export type PermissionContext = {
  userId: number;
  teamId: number;
  role: string;
  permissions: MemberPermissions;
  canSeeAllChats: boolean;
  chatVisibility: ChatVisibility;
};

/**
 * Shared logic to build permission context for a user
 */
async function buildPermissionContext(user: { id: number }): Promise<PermissionContext | null> {
  try {
    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
    });

    if (!membership) return null;

    const role = membership.role as string;
    const rawPerms = membership.permissions as MemberPermissions | null;
    const perms = getPermissions(role, rawPerms);

    return {
      userId: user.id,
      teamId: membership.teamId,
      role: role,
      permissions: perms,
      canSeeAllChats: canSeeAllChats(role, rawPerms),
      chatVisibility: getChatVisibility(role, rawPerms),
    };
  } catch (error) {
    console.error('Error building permission context:', error);
    return null;
  }
}

/**
 * Guard for API routes to check if a user has specific resource permission
 */
export async function checkRoutePermission(
  resource: PermissionResource
): Promise<{ error?: NextResponse; context?: PermissionContext }> {
  const user = await getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 }) };
  }

  const context = await buildPermissionContext(user);
  if (!context) {
    return { error: NextResponse.json({ error: 'Unauthorized', code: 'TEAM_MEMBER_REQUIRED' }, { status: 401 }) };
  }

  if (!hasPermission(context.role, context.permissions, resource)) {
    return { error: NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 }) };
  }

  return { context };
}

/**
 * Utility to get current user's permission context
 */
export async function getUserPermissionContext(): Promise<PermissionContext | null> {
  const user = await getUser();
  if (!user) return null;
  return buildPermissionContext(user);
}
