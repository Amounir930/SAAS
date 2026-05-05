import { db } from '../lib/db/drizzle';
import { plans, teams } from '../lib/db/schema';

async function fix() {
  const [plan] = await db.insert(plans).values({
    name: 'Professional',
    isCampaignsEnabled: true,
    isAiEnabled: true,
    isFlowBuilderEnabled: true,
    isTemplatesEnabled: true,
    isVoiceCallsEnabled: true,
    maxUsers: 10,
    maxContacts: 10000,
    maxInstances: 5,
    amount: 0,
    currency: 'usd',
    interval: 'month'
  }).returning();

  await db.update(teams).set({ planId: plan.id });
  console.log('✅ Features enabled for all teams!');
}

fix().catch(console.error);
