import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { offlinePaymentRequests, plans, teams } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ProcessOfflinePaymentSchema = z.object({
  id: z.string().min(1, 'Request ID is required'),
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action must be either approve or reject' }),
  }),
});

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await db
      .select({
        id: offlinePaymentRequests.id,
        teamId: offlinePaymentRequests.teamId,
        teamName: teams.name,
        planId: offlinePaymentRequests.planId,
        planName: plans.name,
        amount: offlinePaymentRequests.amount,
        currency: offlinePaymentRequests.currency,
        status: offlinePaymentRequests.status,
        notes: offlinePaymentRequests.notes,
        createdAt: offlinePaymentRequests.createdAt,
      })
      .from(offlinePaymentRequests)
      .leftJoin(teams, eq(offlinePaymentRequests.teamId, teams.id))
      .leftJoin(plans, eq(offlinePaymentRequests.planId, plans.id))
      .orderBy(desc(offlinePaymentRequests.createdAt));

    return NextResponse.json({ requests });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Offline Payments GET]', { error: msg });
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
    const result = ProcessOfflinePaymentSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { id, action } = result.data;

    const req = await db.query.offlinePaymentRequests.findFirst({
      where: eq(offlinePaymentRequests.id, id),
    });

    if (!req || req.status !== 'pending') {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 });
    }

    if (action === 'approve') {
      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, req.planId),
      });

      await db.update(teams).set({
        planId: req.planId,
        planName: plan?.name || null,
        gatewayType: 'offline',
        subscriptionStatus: 'active',
        updatedAt: new Date(),
      }).where(eq(teams.id, req.teamId));

      await db.update(offlinePaymentRequests).set({
        status: 'approved',
        updatedAt: new Date(),
      }).where(eq(offlinePaymentRequests.id, id));
      
      logger.info('[Offline Payments] Request approved', { id, teamId: req.teamId, admin: user.id });
    } else {
      await db.update(offlinePaymentRequests).set({
        status: 'rejected',
        updatedAt: new Date(),
      }).where(eq(offlinePaymentRequests.id, id));
      
      logger.info('[Offline Payments] Request rejected', { id, teamId: req.teamId, admin: user.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Offline Payments POST]', { error: msg });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
