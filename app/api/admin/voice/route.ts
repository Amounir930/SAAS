import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { twilioConfigs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const VoiceConfigSchema = z.object({
  accountSid: z.string().min(1, 'Account SID is required').optional(),
  authToken: z.string().min(1, 'Auth Token is required').optional(),
  apiKeySid: z.string().min(1, 'API Key SID is required').optional(),
  apiKeySecret: z.string().min(1, 'API Key Secret is required').optional(),
  twimlAppSid: z.string().nullable().optional(),
  currency: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

function maskSecret(value: string): string {
  if (!value || value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const config = await db.query.twilioConfigs.findFirst();

    if (!config) {
      return NextResponse.json({ configured: false, config: null });
    }

    return NextResponse.json({
      configured: true,
      config: {
        id: config.id,
        accountSid: maskSecret(config.accountSid),
        authToken: maskSecret(config.authToken),
        apiKeySid: maskSecret(config.apiKeySid),
        apiKeySecret: maskSecret(config.apiKeySecret),
        twimlAppSid: config.twimlAppSid ? maskSecret(config.twimlAppSid) : null,
        currency: config.currency,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Voice GET]', { error: msg });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const json = await request.json();
    const result = VoiceConfigSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const body = result.data;
    const isMasked = (v: string) => v && v.includes('••');
    const existing = await db.query.twilioConfigs.findFirst();

    if (!existing && (!body.accountSid || !body.authToken || !body.apiKeySid || !body.apiKeySecret)) {
      return NextResponse.json(
        { error: 'accountSid, authToken, apiKeySid, and apiKeySecret are required for first-time setup' },
        { status: 400 }
      );
    }

    if (existing) {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (body.accountSid && !isMasked(body.accountSid)) updateData.accountSid = body.accountSid;
      if (body.authToken && !isMasked(body.authToken)) updateData.authToken = body.authToken;
      if (body.apiKeySid && !isMasked(body.apiKeySid)) updateData.apiKeySid = body.apiKeySid;
      if (body.apiKeySecret && !isMasked(body.apiKeySecret)) updateData.apiKeySecret = body.apiKeySecret;

      if (body.twimlAppSid !== undefined && !isMasked(body.twimlAppSid || '')) {
        updateData.twimlAppSid = body.twimlAppSid;
      }
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.currency) updateData.currency = body.currency;

      await db
        .update(twilioConfigs)
        .set(updateData)
        .where(eq(twilioConfigs.id, existing.id));
      
      logger.info('[Admin Voice] Twilio config updated', { admin: user.id });
    } else {
      await db.insert(twilioConfigs).values({
        accountSid: body.accountSid!,
        authToken: body.authToken!,
        apiKeySid: body.apiKeySid!,
        apiKeySecret: body.apiKeySecret!,
        twimlAppSid: body.twimlAppSid || null,
        currency: body.currency || 'usd',
        isActive: body.isActive ?? false,
      });
      
      logger.info('[Admin Voice] Twilio config created', { admin: user.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Voice PUT]', { error: msg });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
