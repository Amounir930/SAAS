'use server';

import { db } from '@/lib/db/drizzle';
import { users, teams, plans, teamMembers, activityLogs, invitations, passwordResetTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth/session';
import { sendPasswordResetEmail } from '@/lib/email';
import { randomUUID } from 'crypto';

export type ActionState = {
  error?: string;
  success?: string;
};



async function verifyAdmin() {
  const user = await getUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function updateUserRole(userId: number, role: string): Promise<ActionState> {
  try {
    const currentUser = await verifyAdmin();

    if (currentUser.id === userId) {
      return { error: 'Cannot change your own role.' };
    }

    const validRoles = ['admin', 'member', 'owner'];
    if (!validRoles.includes(role)) {
      return { error: 'Invalid role.' };
    }

    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
    revalidatePath('/admin/users');
    return { success: 'Role updated successfully' };
  } catch (error: any) {
    return { error: error.message || 'Failed to update role' };
  }
}

export async function adminSendResetLink(userId: number): Promise<ActionState> {
  try {
    await verifyAdmin();

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return { error: 'User not found.' };

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    await sendPasswordResetEmail(user.email, token);
    return { success: 'Reset link sent successfully.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to send reset link.' };
  }
}

export async function adminSetPassword(userId: number, newPassword: string): Promise<ActionState> {
  try {
    const currentUser = await verifyAdmin();

    if (newPassword.length < 8) {
      return { error: 'Password must be at least 8 characters.' };
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    return { success: 'Password updated successfully.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to update password.' };
  }
}

export async function deleteUser(userId: number): Promise<ActionState> {
  try {
    const currentUser = await verifyAdmin();

    if (currentUser.id === userId) {
      return { error: 'Cannot delete your own account.' };
    }

    await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
    await db.delete(activityLogs).where(eq(activityLogs.userId, userId));
    
    await db.delete(users).where(eq(users.id, userId));
    revalidatePath('/admin/users');
    return { success: 'User deleted successfully' };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete user' };
  }
}

export async function deleteTeam(teamId: number): Promise<ActionState> {
  try {
    await verifyAdmin();

    if (teamId === 1) {
      return { error: 'Cannot delete the system admin team.' };
    }

    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await db.delete(activityLogs).where(eq(activityLogs.teamId, teamId));
    await db.delete(invitations).where(eq(invitations.teamId, teamId));

    await db.delete(teams).where(eq(teams.id, teamId));
    
    revalidatePath('/admin/teams');
    return { success: 'Team deleted successfully' };
  } catch (error: any) {
    console.error('Delete team error:', error);
    return { error: error.message || 'Failed to delete team' };
  }
}
