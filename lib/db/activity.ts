import { db } from '@/lib/db/drizzle';
import { activityLogs, NewActivityLog, ActivityType } from '@/lib/db/schema';
import { logger } from '@/lib/logger';

/**
 * Records an activity in the audit log with strict validation.
 * @throws {Error} If input validation fails or database operation fails.
 */
export async function logActivity(
  teamId: number,
  userId: number,
  action: ActivityType,
  ipAddress?: string
): Promise<void> {
  // 1. Validate Identifiers
  if (!Number.isInteger(teamId) || teamId <= 0) {
    throw new Error(`Invalid teamId: ${teamId}`);
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(`Invalid userId: ${userId}`);
  }

  // 2. Sanitize IP Address
  const sanitizedIp = ipAddress?.trim() || 'Unknown';
  
  // Basic IP format validation if provided
  if (ipAddress && !/^([0-9]{1,3}\.){3}[0-9]{1,3}$|^([a-f0-9:]+)$/i.test(sanitizedIp)) {
    logger.warn('Malformed IP address received', { ipAddress, userId });
  }

  try {
    const newActivity: NewActivityLog = {
      teamId,
      userId,
      action,
      ipAddress: sanitizedIp,
    };

    await db.insert(activityLogs).values(newActivity);
  } catch (error) {
    logger.error('Failed to persist activity log', {
      error: error instanceof Error ? error.message : String(error),
      teamId,
      userId,
      action
    });
    // Re-throw to ensure caller knows the audit log failed
    throw new Error('Audit logging failure');
  }
}