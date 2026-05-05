import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { plans } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const UpdatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().optional(),
  interval: z.enum(['month', 'year']).optional(),
  maxUsers: z.number().int().min(1).optional(),
  maxInstances: z.number().int().min(1).optional(),
  maxContacts: z.number().int().min(1).optional(),
  isAiEnabled: z.boolean().optional(),
  isFlowBuilderEnabled: z.boolean().optional(),
  status: z.enum(['published', 'draft']).optional(),
  stripeProductId: z.string().nullable().optional(),
  stripePriceId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    
    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid plan ID' }, { status: 400 });
    }

    const session = await getSession();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const result = UpdatePlanSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const [updatedPlan] = await db
      .update(plans)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, id))
      .returning();

    if (!updatedPlan) {
      return NextResponse.json({ message: 'Plan not found' }, { status: 404 });
    }

    logger.info('[Admin Plans] Plan updated', { id, admin: session.user.id });
    return NextResponse.json(updatedPlan);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Plans PATCH]', { id: idStr, error: msg });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid plan ID' }, { status: 400 });
    }

    const session = await getSession();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const deleted = await db.delete(plans).where(eq(plans.id, id)).returning();

    if (deleted.length === 0) {
      return NextResponse.json({ message: 'Plan not found' }, { status: 404 });
    }

    logger.info('[Admin Plans] Plan deleted', { id, admin: session.user.id });
    return NextResponse.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Admin Plans DELETE]', { id: idStr, error: msg });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
