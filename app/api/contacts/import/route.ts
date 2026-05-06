import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { contacts, chats, tags, contactTags, customFields, funnelStages, teamMembers, departments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const ImportSchema = z.object({
  teamId: z.number().int().positive(),
  instanceId: z.number().int().positive().optional(),
  contacts: z.array(z.object({
    phone: z.string().min(1),
    name: z.string().min(1),
    notes: z.string().optional(),
    stage: z.string().optional(),
    agentEmail: z.string().email().optional(),
    department: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customData: z.record(z.string(), z.any()).optional(),
  })).max(1000)
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const parseResult = ImportSchema.safeParse(payload);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.format() }, { status: 400 });
    }

    const { teamId: currentTeamId, instanceId, contacts: contactList } = parseResult.data;

    // 1. CRITICAL: Verify Team Ownership
    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, currentTeamId),
        eq(teamMembers.userId, session.user.id)
      )
    });

    if (!membership) {
      logger.warn('Unauthorized import attempt blocked', { 
        userId: session.user.id, 
        targetTeamId: currentTeamId 
      });
      return NextResponse.json({ error: 'Forbidden: You do not belong to this team' }, { status: 403 });
    }

    const [teamCustomFields, teamStages, teamAgents, teamDepartments] = await Promise.all([
      db.query.customFields.findMany({ where: eq(customFields.teamId, currentTeamId) }),
      db.query.funnelStages.findMany({ where: eq(funnelStages.teamId, currentTeamId) }),
      db.query.teamMembers.findMany({ where: eq(teamMembers.teamId, currentTeamId), with: { user: true } }),
      db.query.departments.findMany({ where: eq(departments.teamId, currentTeamId) })
    ]);

    const fieldMap = new Map(teamCustomFields.map(f => [f.key, f]));
    const stageMap = new Map(teamStages.map(s => [s.name.toLowerCase().trim(), s.id]));
    const agentMap = new Map(teamAgents.map(tm => [tm.user.email.toLowerCase().trim(), tm.user.id]));
    const deptMap = new Map(teamDepartments.map(d => [d.name.toLowerCase().trim(), d.id]));

    let successCount = 0;
    let errorCount = 0;

    for (const item of contactList) {
      try {
        const cleanPhone = item.phone.replace(/\D/g, '');
        if (!cleanPhone) {
          errorCount++;
          continue;
        }
        const remoteJid = `${cleanPhone}@s.whatsapp.net`;

        // Transaction per contact for partial success support
        await db.transaction(async (tx) => {
          let funnelStageId = null;
          if (item.stage) {
            const stageName = item.stage.toLowerCase().trim();
            funnelStageId = stageMap.get(stageName) || null;
          }

          let assignedUserId = null;
          if (item.agentEmail) {
            const email = item.agentEmail.toLowerCase().trim();
            assignedUserId = agentMap.get(email) || null;
          }

          let assignedDepartmentId = null;
          if (item.department) {
            const deptName = item.department.toLowerCase().trim();
            assignedDepartmentId = deptMap.get(deptName) || null;
          }

          let chat = await tx.query.chats.findFirst({
            where: and(eq(chats.teamId, currentTeamId), eq(chats.remoteJid, remoteJid))
          });

          if (!chat) {
            const [newChat] = await tx.insert(chats).values({
              teamId: currentTeamId,
              remoteJid: remoteJid,
              name: item.name,
              unreadCount: 0,
              instanceId: instanceId || null
            }).returning();
            chat = newChat;
          }

          let contact = await tx.query.contacts.findFirst({
            where: and(eq(contacts.teamId, currentTeamId), eq(contacts.chatId, chat.id))
          });

          const customDataToSave: Record<string, any> = {};
          if (item.customData) {
            Object.entries(item.customData).forEach(([key, value]) => {
              const fieldDef = fieldMap.get(key);
              if (fieldDef) {
                if (fieldDef.type === 'boolean') {
                  const strVal = String(value).toLowerCase();
                  customDataToSave[key] = (strVal === 'true' || strVal === 'yes' || strVal === '1');
                } else {
                  customDataToSave[key] = String(value);
                }
              }
            });
          }

          if (contact) {
            await tx.update(contacts).set({
              name: item.name,
              notes: item.notes || contact.notes,
              funnelStageId: funnelStageId || contact.funnelStageId,
              assignedUserId: assignedUserId || contact.assignedUserId,
              assignedDepartmentId: assignedDepartmentId || contact.assignedDepartmentId,
              customData: { ...contact.customData as object, ...customDataToSave }
            }).where(eq(contacts.id, contact.id));
          } else {
            const [newContact] = await tx.insert(contacts).values({
              teamId: currentTeamId,
              chatId: chat.id,
              name: item.name,
              notes: item.notes || '',
              funnelStageId: funnelStageId,
              assignedUserId: assignedUserId,
              assignedDepartmentId: assignedDepartmentId,
              customData: customDataToSave
            }).returning();
            contact = newContact;
          }

          if (item.tags && item.tags.length > 0) {
            for (const tagName of item.tags) {
              const cleanTagName = tagName.trim();
              if (!cleanTagName) continue;

              let tag = await tx.query.tags.findFirst({
                where: and(eq(tags.teamId, currentTeamId), eq(tags.name, cleanTagName))
              });

              if (!tag) {
                const [newTag] = await tx.insert(tags).values({
                  teamId: currentTeamId,
                  name: cleanTagName,
                  color: 'gray'
                }).returning();
                tag = newTag;
              }

              await tx.insert(contactTags).values({
                contactId: contact.id,
                tagId: tag.id
              }).onConflictDoNothing();
            }
          }
        });

        successCount++;
      } catch (e) {
        logger.error('Error importing single contact', { 
          error: e instanceof Error ? e.message : String(e),
          phone: item.phone 
        });
        errorCount++;
      }
    }

    return NextResponse.json({ success: true, imported: successCount, failed: errorCount });
  } catch (error) {
    logger.error('Import process failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}