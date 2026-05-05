import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { channelConfigs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { clearChannelConfigCache } from '@/lib/whatsapp/config';
import { isPluginInstalled } from '@/lib/plugins/registry';
import { logger } from '@/lib/logger';

// === Validation Schemas ===

const ChannelConfigSchema = z.object({
  channel: z.enum(['evolution', 'meta-cloud']),
  isActive: z.boolean().optional().default(false),
  apiUrl: z.string().url().nullable().optional(),
  apiKey: z.string().min(1).nullable().optional(),
  webhookUrl: z.string().url().nullable().optional(),
  webhookToken: z.string().min(1).nullable().optional(),
  metaAppId: z.string().min(1).nullable().optional(),
  metaAppSecret: z.string().min(1).nullable().optional(),
  metaConfigId: z.string().min(1).nullable().optional(),
  metaWebhookToken: z.string().min(1).nullable().optional(),
});

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      logger.warn('[Admin_Channels_GET_Unauthorized]', { userId: user?.id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db.select().from(channelConfigs);
    const evoRow = rows.find(r => r.channel === 'evolution');
    const metaRow = rows.find(r => r.channel === 'meta-cloud');

    const evolution = {
      channel: 'evolution',
      isActive: evoRow?.isActive ?? true,
      apiUrl: evoRow?.apiUrl || process.env.EVOLUTION_API_URL || '',
      apiKey: evoRow?.apiKey || process.env.AUTHENTICATION_API_KEY || '',
      webhookToken: evoRow?.webhookToken || process.env.NEXT_PUBLIC_EVOLUTION_WEBHOOK_TOKEN || '',
    };

    const metaCloud = {
      channel: 'meta-cloud',
      isActive: metaRow?.isActive ?? false,
      metaAppId: metaRow?.metaAppId || process.env.META_APP_ID || '',
      metaAppSecret: metaRow?.metaAppSecret || process.env.META_APP_SECRET || '',
      metaConfigId: metaRow?.metaConfigId || process.env.NEXT_PUBLIC_META_CONFIG_ID || '',
      metaWebhookToken: metaRow?.metaWebhookToken || process.env.META_WEBHOOK_VERIFY_TOKEN || '',
    };

    return NextResponse.json({
      channels: { evolution, metaCloud },
      plugins: { metaCloud: isPluginInstalled('meta-cloud') },
    });
  } catch (error: any) {
    logger.error('[Admin_Channels_GET_Failed]', { error: error.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      logger.warn('[Admin_Channels_PUT_Unauthorized]', { userId: user?.id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = ChannelConfigSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid configuration data', 
        details: validation.error.format() 
      }, { status: 400 });
    }

    const { channel, isActive, ...rest } = validation.data;

    const updateData: any = {
      isActive,
      updatedAt: new Date(),
    };

    // Surgical updates based on channel type
    if (channel === 'evolution') {
      if (rest.apiUrl !== undefined) updateData.apiUrl = rest.apiUrl;
      if (rest.apiKey !== undefined) updateData.apiKey = rest.apiKey;
      if (rest.webhookUrl !== undefined) updateData.webhookUrl = rest.webhookUrl;
      if (rest.webhookToken !== undefined) updateData.webhookToken = rest.webhookToken;
    } else if (channel === 'meta-cloud') {
      if (rest.metaAppId !== undefined) updateData.metaAppId = rest.metaAppId;
      if (rest.metaAppSecret !== undefined) updateData.metaAppSecret = rest.metaAppSecret;
      if (rest.metaConfigId !== undefined) updateData.metaConfigId = rest.metaConfigId;
      if (rest.metaWebhookToken !== undefined) updateData.metaWebhookToken = rest.metaWebhookToken;
    }

    const existing = await db.select({ id: channelConfigs.id })
      .from(channelConfigs)
      .where(eq(channelConfigs.channel, channel))
      .limit(1);

    if (existing.length > 0) {
      await db.update(channelConfigs)
        .set(updateData)
        .where(eq(channelConfigs.channel, channel));
    } else {
      await db.insert(channelConfigs).values({
        channel,
        ...updateData,
      });
    }

    clearChannelConfigCache();
    logger.info('[Admin_Channels_Updated]', { channel, userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('[Admin_Channels_PUT_Failed]', { error: error.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
