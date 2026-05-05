import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { checkRoutePermission } from '@/lib/auth/permissions-guard';
import { campaigns, campaignLeads } from '@/lib/db/schema';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const CampaignLeadSchema = z.object({
  phone: z.string().min(1).max(50),
  variables: z.record(z.any()).optional(),
});

const CampaignCreateSchema = z.object({
  name: z.string().min(1).max(255),
  instanceId: z.coerce.number().int().positive(),
  scheduledAt: z.string().datetime().optional().nullable(),
  templateId: z.coerce.number().int().positive().optional().nullable(),
  leads: z.array(CampaignLeadSchema).min(1),
  createContacts: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const { error: permError } = await checkRoutePermission('campaigns');
    if (permError) return permError;

    const team = await getTeamForUser();
    if (!team) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const validatedData = CampaignCreateSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.errors[0].message }, { status: 400 });
    }

    const { name, instanceId, scheduledAt, templateId, leads, createContacts } = validatedData.data;

    const hasSchedule = !!scheduledAt;
    const [newCampaign] = await db.insert(campaigns).values({
      teamId: team.id,
      instanceId,
      name,
      scheduledAt: hasSchedule ? new Date(scheduledAt!) : null,
      templateId,
      status: hasSchedule ? 'SCHEDULED' : 'DRAFT',
      totalLeads: leads.length,
      createContacts
    }).returning();

    const leadsData = leads.map((lead) => ({
      campaignId: newCampaign.id,
      phone: lead.phone.replace(/[^\d]/g, ''),
      variables: lead.variables || {},
      status: 'PENDING' as const
    }));
    
    await db.insert(campaignLeads).values(leadsData);

    await logger.info('Campaign created', {
      teamId: team.id,
      campaignId: newCampaign.id,
      name,
      leadsCount: leads.length
    });

    return NextResponse.json(newCampaign);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Campaign creation error', { error: message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}