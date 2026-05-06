import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { plans } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const PlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  currency: z.string().default('usd'),
  interval: z.enum(['month', 'year']),
  maxUsers: z.number().int().min(1).default(1),
  maxInstances: z.number().int().min(1).default(1),
  maxContacts: z.number().int().min(1).default(100),
  isAiEnabled: z.boolean().default(false),
  isFlowBuilderEnabled: z.boolean().default(false),
  status: z.enum(['published', 'draft']).default('draft'),
  stripeProductId: z.string().default(''),
  stripePriceId: z.string().default(''),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const allPlans = await db.query.plans.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    return NextResponse.json(allPlans);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Plans GET]', { error: msg });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const result = PlanSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const [newPlan] = await db.insert(plans).values({
      ...result.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    logger.info('[Admin Plans] Plan created', { id: newPlan.id, admin: session.user.id });
    return NextResponse.json(newPlan);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Plans POST]', { error: msg });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
