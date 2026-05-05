import { z } from 'zod';

export const CheckoutOptionsSchema = z.object({
  planId: z.number(),
  planName: z.string(),
  amount: z.number(), 
  currency: z.string(),
  interval: z.enum(['month', 'year']),
  trialDays: z.number().optional(),
  teamId: z.number(),
  userId: z.number(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  gatewayProductId: z.string().optional(),
  gatewayPriceId: z.string().optional(),
  existingCustomerId: z.string().optional(),
});

export type CheckoutOptions = z.infer<typeof CheckoutOptionsSchema>;

export type ActionState<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export interface CheckoutResult {
  url?: string;
  orderId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface SubscriptionInfo {
  gatewaySubscriptionId: string;
  gatewayCustomerId: string;
  status: string;
  productId?: string;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: Date | null;
}

export interface PaymentGatewayAdapter {
  readonly type: 'stripe' | 'razorpay' | 'offline';

  createCheckout(options: CheckoutOptions): Promise<ActionState<CheckoutResult>>;

  cancelSubscription(subscriptionId: string): Promise<ActionState>;

  createPortalSession?(customerId: string, returnUrl: string): Promise<ActionState<{ url: string }>>;

  verifyWebhook(body: string, signature: string): Promise<ActionState<any>>;
}
