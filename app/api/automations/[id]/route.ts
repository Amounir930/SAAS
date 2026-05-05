import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { automations } from '@/lib/db/schema';
import { getTeamForUser } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const idSchema = z.string().regex(/^\d+$/).transform(Number);

const automationUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  instanceId: z.number().nullable().optional(),
  triggerKeyword: z.string().max(100).nullable().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const idResult = idSchema.safeParse(idStr);
    
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const id = idResult.data;

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.query.automations.findFirst({
      where: and(
        eq(automations.id, id),
        eq(automations.teamId, team.id)
      ),
    });

    if (!result) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching automation', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const idResult = idSchema.safeParse(idStr);
    
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const id = idResult.data;

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = automationUpdateSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.errors[0].message }, { status: 400 });
    }

    const [updated] = await db
      .update(automations)
      .set({
        ...validatedData.data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(automations.id, id),
        eq(automations.teamId, team.id)
      ))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Automation not found or access denied' }, { status: 404 });
    }

    await logger.info('Automation updated', {
      teamId: team.id,
      automationId: id,
      updates: Object.keys(validatedData.data)
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error updating automation', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
