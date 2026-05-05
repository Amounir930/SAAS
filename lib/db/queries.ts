import { desc, and, eq, isNull, count } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users, plans, contacts, evolutionInstances } from './schema';
import { cookies, headers } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

import { logger } from '@/lib/logger';

export async function getUser() {
  const getSessionData = async () => {
    try {
      // 1. Check Authorization Header
      const authHeader = (await headers()).get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (!token) return null;
        return await verifyToken(token);
      }

      // 2. Check Session Cookie
      const sessionCookie = (await cookies()).get('session');
      if (sessionCookie?.value) {
        return await verifyToken(sessionCookie.value);
      }
    } catch (error) {
      logger.error('Token verification failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
    return null;
  };

  const sessionData = await getSessionData();

  if (!sessionData?.user?.id || typeof sessionData.user.id !== 'number') {
    return null;
  }

  // Validate Expiration
  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
      .limit(1);

    return user.length > 0 ? user[0] : null;
  } catch (error) {
    logger.error('Database error in getUser', { 
      userId: sessionData.user.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}


export async function getPublishedPlans() {
  return await db.select().from(plans).orderBy(plans.amount);
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}


export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getFreePlan() {
  const result = await db
    .select()
    .from(plans)
    .where(eq(plans.amount, 0))
    .limit(1);

  return result[0] || null;
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }


  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          evolutionInstances: true
        }
      }
    }
  });

  return result?.team || null;
}

export async function getUserMembership() {
  const user = await getUser();
  if (!user) return null;

  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    columns: {
      role: true,
      permissions: true,
    }
  });

  return membership || null;
}
