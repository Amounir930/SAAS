import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teams, twilioConfigs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { enforceFeature } from '@/lib/limits';
import { getGatewayById } from '@/lib/payments';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const purchaseSchema = z.object({
  packs: z.number().int().positive().min(1).max(100), // Safety limit: max 100 packs
});

export async function POST(request: Request) {
  try {
    const limited = checkRateLimit(`purchase:${getClientIp(request)}`, RATE_LIMITS.purchase);
    if (limited) return limited;

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const teamId = userWithTeam.teamId;
    await enforceFeature(teamId, 'isVoiceCallsEnabled');

    const config = await db.query.twilioConfigs.findFirst({
      where: eq(twilioConfigs.isActive, true),
    });

    if (!config) {
      return NextResponse.json({ error: 'Voice calling is not configured.' }, { status: 400 });
    }

    if (!config.paymentGatewayId) {
      return NextResponse.json({ error: 'No payment gateway configured for voice calls.' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = purchaseSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.errors[0].message }, { status: 400 });
    }

    const { packs } = validatedData.data;
    const creditAmount = packs * (config.creditsPerPack || 0);
    const totalCents = packs * (config.creditPricePerPack || 0);
    const currency = config.currency || 'usd';
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
    const adapter = await getGatewayById(config.paymentGatewayId);

    const result = await adapter.createCheckout({
      planId: 0,
      planName: `Voice Credits (${creditAmount} min)`,
      amount: totalCents,
      currency,
      interval: 'month',
      teamId,
      userId: user.id,
      successUrl: `${baseUrl}/settings/voice?credits=success`,
      cancelUrl: `${baseUrl}/settings/voice?credits=cancel`,
      existingCustomerId: adapter.type === 'stripe' ? (team?.stripeCustomerId || undefined) : undefined,
    });

    await logger.info('Call credits purchase initiated', {
      teamId,
      userId: user.id,
      packs,
      amount: totalCents,
      currency
    });

    // Handle offline legacy behavior if still active
    if (adapter.type === 'offline') {
      try {
        const { addCredits } = await import('@/lib/plugins/voice-call/service');
        await addCredits(teamId, creditAmount, undefined, `${packs} pack(s) - offline auto-approval`);
      } catch (e) {
        logger.error('Failed to auto-add offline credits', { error: e });
      }
    }

    return NextResponse.json({ url: result.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Credits Purchase]', { error: message });
    
    if (message.includes('does not allow access')) {
      return NextResponse.json({ error: 'Feature not available on your plan' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
