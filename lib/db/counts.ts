import { eq, count } from 'drizzle-orm';
import { db } from './drizzle';
import { teamMembers, contacts, evolutionInstances } from './schema';

export async function getTeamMemberCount(teamId: number) {
  const [result] = await db
    .select({ count: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  return result.count;
}

export async function getContactCount(teamId: number) {
  const [result] = await db
    .select({ count: count() })
    .from(contacts)
    .where(eq(contacts.teamId, teamId));
  return result.count;
}

export async function getInstanceCount(teamId: number) {
  const [result] = await db
    .select({ count: count() })
    .from(evolutionInstances)
    .where(eq(evolutionInstances.teamId, teamId));
  return result.count;
}
