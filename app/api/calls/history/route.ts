import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { callLogs, users } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  chatId: z.string().regex(/^\d+$/).transform(Number).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const teamId = userWithTeam.teamId;

    const { searchParams } = new URL(req.url);
    const paramsResult = querySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!paramsResult.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const { chatId, page, limit } = paramsResult.data;
    const safeLimit = Math.min(100, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    const conditions = [eq(callLogs.teamId, teamId)];
    if (chatId) {
      conditions.push(eq(callLogs.chatId, chatId));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ count: count() })
      .from(callLogs)
      .where(whereClause);

    const total = totalResult.count;
    const totalPages = Math.ceil(total / safeLimit);

    const calls = await db
      .select({
        id: callLogs.id,
        teamId: callLogs.teamId,
        chatId: callLogs.chatId,
        userId: callLogs.userId,
        twilioCallSid: callLogs.twilioCallSid,
        direction: callLogs.direction,
        fromNumber: callLogs.fromNumber,
        toNumber: callLogs.toNumber,
        status: callLogs.status,
        duration: callLogs.duration,
        creditsUsed: callLogs.creditsUsed,
        recordingUrl: callLogs.recordingUrl,
        recordingSid: callLogs.recordingSid,
        startedAt: callLogs.startedAt,
        endedAt: callLogs.endedAt,
        createdAt: callLogs.createdAt,
        callerName: users.name,
      })
      .from(callLogs)
      .leftJoin(users, eq(callLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(callLogs.createdAt))
      .limit(safeLimit)
      .offset(offset);

    return NextResponse.json({
      calls,
      total,
      totalPages,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Calls History]', { error: message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
