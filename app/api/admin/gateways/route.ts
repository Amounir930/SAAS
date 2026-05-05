import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { paymentGateways } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const GatewayConfigSchema = z.object({
  id: z.string().optional(),
  gateway: z.string().min(1, 'Gateway provider is required'),
  displayName: z.string().optional(),
  publicKey: z.string().min(1, 'Public key is required'),
  secretKey: z.string().min(1, 'Secret key is required'),
  webhookSecret: z.string().nullable().optional(),
  isActive: z.boolean().default(false),
});

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gateways = await db.query.paymentGateways.findMany({
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });

    const masked = gateways.map((gw) => ({
      ...gw,
      secretKey: gw.secretKey ? '••••••' + gw.secretKey.slice(-4) : '',
      webhookSecret: gw.webhookSecret ? '••••••' + gw.webhookSecret.slice(-4) : '',
    }));

    return NextResponse.json({ gateways: masked });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Gateways GET]', { error: msg });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const result = GatewayConfigSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { id, gateway, displayName, publicKey, secretKey, webhookSecret, isActive } = result.data;

    if (id) {
      const updateData: any = {
        displayName: displayName || gateway,
        publicKey,
        isActive: isActive ?? false,
        updatedAt: new Date(),
      };
      
      // Only update secrets if they are not the masked ones
      if (secretKey && !secretKey.startsWith('••••')) {
        updateData.secretKey = secretKey;
      }
      if (webhookSecret && !webhookSecret.startsWith('••••')) {
        updateData.webhookSecret = webhookSecret;
      }

      const [updated] = await db.update(paymentGateways)
        .set(updateData)
        .where(eq(paymentGateways.id, id))
        .returning();

      logger.info('[Admin Gateways] Gateway updated', { id, admin: user.id });
      return NextResponse.json({ gateway: updated });
    } else {
      const [created] = await db.insert(paymentGateways)
        .values({
          gateway,
          displayName: displayName || gateway,
          publicKey,
          secretKey,
          webhookSecret: webhookSecret || null,
          isActive: isActive ?? false,
        })
        .returning();

      logger.info('[Admin Gateways] Gateway created', { id: created.id, admin: user.id });
      return NextResponse.json({ gateway: created }, { status: 201 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Gateways POST]', { error: msg });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
