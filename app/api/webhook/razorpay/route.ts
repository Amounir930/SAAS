import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { plans, teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getGatewayByType } from '@/lib/payments';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

// --- Validation Schemas ---
const RazorpayNotesSchema = z.object({
  planId: z.string().regex(/^\d+$/).transform(Number),
  teamId: z.string().regex(/^\d+$/).transform(Number),
});

const RazorpayWebhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    subscription: z.object({
      entity: z.object({
        id: z.string(),
        customer_id: z.string().nullable().optional(),
        notes: z.any().optional(),
      }).optional(),
    }).optional(),
  }).optional(),
});

/**
 * Razorpay Webhook Handler - Hardened
 */
export async function POST(request: NextRequest) {
  try {
    const limited = checkRateLimit(`webhook:${getClientIp(request)}`, RATE_LIMITS.webhook);
    if (limited) return limited;

    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // 1. Signature Verification
    let event: any;
    try {
      const adapter = await getGatewayByType('razorpay');
      event = await adapter.verifyWebhook(rawBody, signature);
      
      // Parse with basic schema to ensure core structure
      const parsed = RazorpayWebhookSchema.safeParse(event);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
      }
    } catch (err: any) {
      console.error('[Razorpay Webhook] Verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const eventType = event.event;
    const subscription = event.payload?.subscription?.entity;

    if (!subscription) {
      return NextResponse.json({ received: true, ignored: 'no_subscription_entity' });
    }

    // 2. Process Subscription Events
    if (eventType === 'subscription.activated' || eventType === 'subscription.charged') {
      const notesResult = RazorpayNotesSchema.safeParse(subscription.notes);
      
      if (!notesResult.success) {
        console.warn('[Razorpay Webhook] Invalid or missing notes:', notesResult.error.format());
        return NextResponse.json({ received: true, ignored: 'invalid_notes' });
      }

      const { planId, teamId } = notesResult.data;

      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, planId),
      });

      if (!plan) {
        console.error(`[Razorpay Webhook] Plan ID ${planId} not found in DB`);
        return NextResponse.json({ received: true, error: 'plan_not_found' });
      }

      await db.update(teams).set({
        planId: planId,
        planName: plan.name,
        gatewayType: 'razorpay',
        gatewayCustomerId: subscription.customer_id || null,
        gatewaySubscriptionId: subscription.id,
        subscriptionStatus: 'active',
        updatedAt: new Date(),
      }).where(eq(teams.id, teamId));

      console.info(`[Razorpay Webhook] Subscription ${subscription.id} processed for team ${teamId}`);

    } else if (eventType === 'subscription.cancelled' || eventType === 'subscription.halted') {
      const notesResult = RazorpayNotesSchema.safeParse(subscription.notes);
      
      if (notesResult.success) {
        const { teamId } = notesResult.data;
        
        const freePlan = await db.query.plans.findFirst({
          where: eq(plans.amount, 0),
        });

        await db.update(teams).set({
          planId: freePlan?.id || null,
          planName: freePlan?.name || null,
          gatewaySubscriptionId: null,
          subscriptionStatus: 'active',
          isCanceled: false,
          updatedAt: new Date(),
        }).where(eq(teams.id, teamId));
        
        console.info(`[Razorpay Webhook] Subscription cancelled for team ${teamId}`);
      }
    }

    return NextResponse.json({ success: true, event: eventType });
  } catch (error: any) {
    console.error('[Razorpay Webhook Error]', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
