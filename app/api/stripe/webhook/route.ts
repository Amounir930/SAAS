import Stripe from 'stripe';
import { handleSubscriptionChange } from '@/lib/payments/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { paymentGateways } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { StripeAdapter } from '@/lib/payments/adapters/stripe-adapter';
import { z } from 'zod';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { provisionPhoneNumber, addCredits } from '@/lib/plugins/voice-call/service';

// --- Validation Schemas ---
const MetadataSchema = z.object({
  teamId: z.string().regex(/^\d+$/).transform(Number),
  type: z.enum(['phone_number_purchase', 'voice_credits']).optional(),
  phoneNumber: z.string().optional(),
  creditAmount: z.string().regex(/^\d+$/).transform(Number).optional(),
});

async function getStripeWebhookConfig() {
  const gw = await db.query.paymentGateways.findFirst({
    where: and(eq(paymentGateways.gateway, 'stripe'), eq(paymentGateways.isActive, true)),
  });
  
  if (gw) {
    return { secretKey: gw.secretKey, webhookSecret: gw.webhookSecret || '' };
  }
  
  // Fallback to env
  return { 
    secretKey: process.env.STRIPE_SECRET_KEY || '', 
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '' 
  };
}

/**
 * Stripe Webhook Handler - Sanitized
 */
export async function POST(request: NextRequest) {
  try {
    const limited = checkRateLimit(`webhook:${getClientIp(request)}`, RATE_LIMITS.webhook);
    if (limited) return limited;

    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    const config = await getStripeWebhookConfig();
    if (!config.secretKey) {
      console.error('[Stripe Webhook] Secret key missing');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const adapter = new StripeAdapter(config.secretKey, config.webhookSecret);
    let event: Stripe.Event;

    // 1. Signature Verification
    try {
      event = await adapter.verifyWebhook(payload, signature);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 2. Event Dispatching
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription).catch(err => 
          console.error('[Stripe Webhook] handleSubscriptionChange error:', err)
        );
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadataResult = MetadataSchema.safeParse(session.metadata);

        if (!metadataResult.success) {
          console.warn('[Stripe Webhook] Invalid session metadata:', metadataResult.error.format());
          return NextResponse.json({ received: true, ignored: 'invalid_metadata' });
        }

        const { teamId, type, phoneNumber, creditAmount } = metadataResult.data;

        if (type === 'phone_number_purchase' && phoneNumber) {
          const subscriptionId = session.subscription as string | null;
          await provisionPhoneNumber(teamId, phoneNumber, subscriptionId || undefined).catch(err =>
            console.error('[Stripe Webhook] Provision failed:', err)
          );
        } else if (type === 'voice_credits' && creditAmount) {
          const paymentIntentId = session.payment_intent as string | null;
          await addCredits(teamId, creditAmount, paymentIntentId || undefined, 'Stripe top-up').catch(err =>
            console.error('[Stripe Webhook] Credit add failed:', err)
          );
        }
        break;
      }

      default:
        // Unhandled event types are ignored gracefully
        break;
    }

    return NextResponse.json({ success: true, event: event.type });
  } catch (error: any) {
    console.error('[Stripe Webhook Fatal Error]', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
