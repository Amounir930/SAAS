import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers, activityLogs, plans } from '@/lib/db/schema';
import { count, eq, desc, sql, ilike, and, or, type SQL } from 'drizzle-orm';
import { z } from 'zod';

// === Validation Schemas ===

export const UsersFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  teamId: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  perPage: z.number().int().positive().optional().default(20),
});

export type UsersFilters = z.infer<typeof UsersFiltersSchema>;

export type ActionState<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// === Core Logic ===

export async function getAdminStats() {
  const [userCount] = await db.select({ count: count() }).from(users);
  const [teamCount] = await db.select({ count: count() }).from(teams);
  const [activeSubs] = await db
    .select({ count: count() })
    .from(teams)
    .where(eq(teams.subscriptionStatus, 'active'));

  return {
    users: userCount.count,
    teams: teamCount.count,
    activeSubscriptions: activeSubs.count,
  };
}

export async function getAllUsers(filters: UsersFilters = {}) {
  const validatedFilters = UsersFiltersSchema.parse(filters);
  const { search, role, teamId, page, perPage } = validatedFilters;
  const offset = (page - 1) * perPage;

  const conditions: SQL[] = [];

  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )!
    );
  }

  if (role) {
    conditions.push(eq(users.role, role));
  }

  if (teamId) {
    const parsedTeamId = parseInt(teamId);
    if (!isNaN(parsedTeamId)) {
      conditions.push(
        sql`users.id IN (SELECT tm.user_id FROM team_members tm WHERE tm.team_id = ${parsedTeamId})`
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        teamName: sql<string>`(
          SELECT t.name FROM team_members tm
          JOIN teams t ON t.id = tm.team_id
          WHERE tm.user_id = users.id
          LIMIT 1
        )`.as('team_name'),
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ count: count() }).from(users).where(where),
  ]);

  return {
    users: data,
    total: totalResult[0].count,
    page,
    perPage,
    totalPages: Math.ceil(totalResult[0].count / perPage),
  };
}

export async function getAllTeamsList() {
  return await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .orderBy(teams.name);
}

export async function getAllTeams() {
  return await db
    .select({
      id: teams.id,
      name: teams.name,
      planId: teams.planId,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      createdAt: teams.createdAt,
      memberCount: count(users.id),
    })
    .from(teams)
    .leftJoin(users, sql`${teams.id} = (SELECT team_id FROM team_members WHERE user_id = ${users.id} LIMIT 1)`)
    .groupBy(teams.id)
    .orderBy(desc(teams.createdAt))
    .limit(100);
}

export async function getRecentActivity() {
  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      user: users.email,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(20);
}

export async function getAllPlans() {
  return await db.select().from(plans).orderBy(desc(plans.createdAt));
}

export async function getPlanById(id: number) {
  const result = await db.select().from(plans).where(eq(plans.id, id));
  return result[0] || null;
}