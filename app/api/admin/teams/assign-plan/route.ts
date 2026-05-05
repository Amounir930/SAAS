import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teams, plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const AssignPlanSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  planId: z.number().int().min(1, 'Plan ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const result = AssignPlanSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { teamId, planId } = result.data;

    const plan = await db.query.plans.findFirst({
      where: eq(plans.id, planId),
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    await db.update(teams).set({
      planId: plan.id,
      planName: plan.name,
      subscriptionStatus: 'active',
      updatedAt: new Date(),
    }).where(eq(teams.id, teamId));

    logger.info('[Admin Teams] Plan manually assigned', { teamId, planId, admin: user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Teams Assign Plan]', { error: msg });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
