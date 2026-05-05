import { NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { callLogs, teamPhoneNumbers, chats } from '@/lib/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const initiateSchema = z.object({
  toNumber: z.string().min(1).max(20).regex(/^\+?[\d\s-]+$/),
  chatId: z.number().int().positive().optional().nullable(),
  callSid: z.string().max(100).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = initiateSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.errors[0].message }, { status: 400 });
    }

    const { toNumber, chatId, callSid } = validatedData.data;

    const phoneNum = await db.query.teamPhoneNumbers.findFirst({
      where: and(
        eq(teamPhoneNumbers.teamId, userWithTeam.teamId),
        eq(teamPhoneNumbers.isActive, true),
      ),
    });

    const fromNumber = phoneNum?.phoneNumber || 'unknown';

    let resolvedChatId: number | null = chatId || null;
    if (!resolvedChatId && toNumber) {
      const cleanNumber = toNumber.replace(/[^\d]/g, '');
      if (cleanNumber) {
        const chat = await db.query.chats.findFirst({
          where: and(
            eq(chats.teamId, userWithTeam.teamId),
            like(chats.remoteJid, `${cleanNumber}@%`)
          ),
          columns: { id: true },
        });
        resolvedChatId = chat?.id || null;
      }
    }

    const [log] = await db.insert(callLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      chatId: resolvedChatId,
      twilioCallSid: callSid || null,
      direction: 'outbound',
      fromNumber,
      toNumber,
      status: 'initiated',
      startedAt: new Date(),
    }).returning();

    await logger.info('Call initiated', {
      teamId: userWithTeam.teamId,
      userId: user.id,
      callLogId: log.id,
      toNumber
    });

    return NextResponse.json({
      callLogId: log.id,
      callSid: callSid || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Calls Initiate]', { error: message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
