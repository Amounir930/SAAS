import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { twilioConfigs, callLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const sidSchema = z.string().regex(/^RE[a-f0-9]+$/i);

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

    const sidParam = req.nextUrl.searchParams.get('sid');
    const sidResult = sidSchema.safeParse(sidParam);
    
    if (!sidResult.success) {
      return NextResponse.json({ error: 'Invalid recording SID' }, { status: 400 });
    }
    const sid = sidResult.data;

    // Forensic Security: Verify ownership to prevent IDOR
    const logEntry = await db.query.callLogs.findFirst({
      where: and(
        eq(callLogs.recordingSid, sid),
        eq(callLogs.teamId, userWithTeam.teamId)
      )
    });

    if (!logEntry) {
      await logger.warn('Unauthorized recording access attempt', {
        userId: user.id,
        teamId: userWithTeam.teamId,
        sid
      });
      return NextResponse.json({ error: 'Recording not found or access denied' }, { status: 404 });
    }

    // Try local file first (cached)
    const localPath = path.join(process.cwd(), 'uploads', 'recordings', `${sid}.mp3`);
    try {
      const fileBuffer = await readFile(localPath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'private, max-age=86400',
        },
      });
    } catch {
      // Not found locally, proceed to proxy from Twilio
    }

    const config = await db.query.twilioConfigs.findFirst({
      where: eq(twilioConfigs.isActive, true),
    });

    if (!config) {
      logger.error('Twilio not configured during recording fetch');
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 });
    }

    const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Recordings/${sid}.mp3`;
    const authHeader = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    const response = await fetch(recordingUrl, {
      headers: { Authorization: `Basic ${authHeader}` },
    });

    if (!response.ok) {
      logger.error('Failed to fetch recording from Twilio', { sid, status: response.status });
      return NextResponse.json(
        { error: 'Failed to fetch recording' },
        { status: response.status === 404 ? 404 : 500 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Recording Proxy]', { error: message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
