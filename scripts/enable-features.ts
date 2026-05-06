import { db } from '../lib/db/drizzle';
import { plans, teams } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function fix() {
  let [plan] = await db.select().from(plans).where(eq(plans.name, 'Lite Edition')).limit(1);

  if (!plan) {
    [plan] = await db.insert(plans).values({
      name: 'Lite Edition',
      description: 'Unlimited access for single-client deployment',
      isCampaignsEnabled: true,
      isAiEnabled: true,
      isFlowBuilderEnabled: true,
      isTemplatesEnabled: true,
      isVoiceCallsEnabled: true,
      maxUsers: 999,
      maxContacts: 999999,
      maxInstances: 999,
    }).returning();
  }

  await db.update(teams).set({ 
    planId: plan.id
  });
  
  console.log('✅ System normalized to Lite Edition!');
}

fix().catch(console.error);
