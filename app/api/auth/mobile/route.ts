import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, teamMembers, teams } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { comparePasswords } from '@/lib/auth/session';
import { signToken, verifyToken } from '@/lib/auth/jwt';
import { getPermissions } from '@/lib/permissions';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

// --- Validation Schemas ---
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Mobile Auth POST - Login & Token Generation
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = checkRateLimit(`login:${ip}`, RATE_LIMITS.auth || { interval: 60, limit: 5 });
    if (limited) return limited;

    const rawBody = await request.json();
    const result = LoginSchema.safeParse(rawBody);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid credentials format', details: result.error.format() }, { status: 400 });
    }

    const { email, password } = result.data;

    const userWithTeam = await db
      .select({
        user: users,
        team: teams,
        role: teamMembers.role,
        customPermissions: teamMembers.permissions,
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    if (userWithTeam.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const { user: foundUser, team: foundTeam, role, customPermissions } = userWithTeam[0];

    const isPasswordValid = await comparePasswords(password, foundUser.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!foundTeam) {
      return NextResponse.json({ error: 'User is not assigned to a team' }, { status: 403 });
    }

    // Generate Long-Lived Token for Mobile (30 days)
    const expiresIn30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const token = await signToken({
      user: { 
        id: foundUser.id,
        role: role || 'member',
        teamId: foundTeam.id
      },
      expires: expiresIn30Days.toISOString(),
    });

    const effectiveRole = role || 'member';
    const permissions = getPermissions(effectiveRole, customPermissions);

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresIn30Days.toISOString(),
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: effectiveRole,
      },
      team: {
        id: foundTeam.id,
        name: foundTeam.name,
      },
      permissions,
    });
  } catch (error: any) {
    console.error('[Mobile Login Error]', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Mobile Auth GET - Profile / Token Verification
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication token required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let sessionData;
    
    try {
      sessionData = await verifyToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: 'Invalid session structure' }, { status: 401 });
    }

    const userWithTeam = await db
      .select({
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        team: {
          id: teams.id,
          name: teams.name,
        },
        role: teamMembers.role,
        customPermissions: teamMembers.permissions,
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
      .limit(1);

    if (userWithTeam.length === 0) {
      return NextResponse.json({ error: 'User context no longer valid' }, { status: 404 });
    }

    const { user, team, role, customPermissions: cp } = userWithTeam[0];
    const effectiveRole = role || 'member';
    const permissions = getPermissions(effectiveRole, cp);

    return NextResponse.json({
      success: true,
      user: { ...user, role: effectiveRole },
      team,
      permissions,
    });
  } catch (error: any) {
    console.error('[Mobile Verify Error]', error.message);
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
  }
}
