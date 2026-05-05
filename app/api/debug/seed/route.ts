import { db } from '@/lib/db/drizzle';
import { 
  teams, 
  chats, 
  messages, 
  contacts, 
  funnelStages, 
  tags, 
  contactTags,
  evolutionInstances
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUser, getUserWithTeam } from '@/lib/db/queries';

export async function GET() {
  try {
    // 1. Get the current user and their team
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Please login to the dashboard first to seed data for your team.' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
       return Response.json({ error: 'User does not belong to a team.' }, { status: 400 });
    }
    
    const teamId = userWithTeam.teamId;

    // 2. Cleanup old demo chats
    const existingChats = await db.select().from(chats).where(eq(chats.teamId, teamId));
    for (const chat of existingChats) {
      if (chat.remoteJid.includes('demo')) {
        await db.delete(chats).where(eq(chats.id, chat.id));
      }
    }

    // 3. Ensure we have an instance
    let instance = (await db.select().from(evolutionInstances).where(eq(evolutionInstances.teamId, teamId)).limit(1))[0];
    if (!instance) {
      const [newId] = await db.insert(evolutionInstances).values({
        teamId: teamId,
        instanceName: 'demo-instance',
        displayName: 'Demo WhatsApp',
        integration: 'WHATSAPP-BAILEYS',
        evolutionInstanceId: 'demo_' + Date.now(),
      }).returning({ id: evolutionInstances.id });
      instance = (await db.select().from(evolutionInstances).where(eq(evolutionInstances.id, newId.id)).limit(1))[0];
    }

    // 4. Create Funnel Stages Idempotently
    const stagesData = [
      { name: 'Unassigned', emoji: '📍', order: 0 },
      { name: 'Negotiation', emoji: '💼', order: 1 },
      { name: 'New', emoji: '🔵', order: 2 },
      { name: 'Closed', emoji: '✅', order: 3 },
    ];
    
    const createdStages = [];
    for (const s of stagesData) {
      const existing = await db.select().from(funnelStages).where(and(eq(funnelStages.teamId, teamId), eq(funnelStages.name, s.name))).limit(1);
      if (existing.length > 0) {
        createdStages.push(existing[0]);
      } else {
        const [res] = await db.insert(funnelStages).values({ teamId, ...s }).returning();
        createdStages.push(res);
      }
    }

    // 5. Create Tags Idempotently
    const tagsData = [
      { name: 'Hot Lead', color: 'red' },
      { name: 'WhatsApp API', color: 'purple' },
      { name: 'Support', color: 'blue' },
    ];
    const createdTags = [];
    for (const t of tagsData) {
      const existing = await db.select().from(tags).where(and(eq(tags.teamId, teamId), eq(tags.name, t.name))).limit(1);
      if (existing.length > 0) {
        createdTags.push(existing[0]);
      } else {
        const [res] = await db.insert(tags).values({ teamId, ...t }).returning();
        createdTags.push(res);
      }
    }

    // 6. Create 25 Dummy Chats, Contacts & Random Messages
    const names = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy", "Mallory", "Niaj", "Olivia", "Peggy", "Rupert", "Sybil", "Trudy", "Uma", "Victor", "Walter", "Xenia", "Yara", "Zane", "Alex", "Jordan"];
    
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const jid = `demo_${1000000000 + i}@s.whatsapp.net`;
      
      const [chat] = await db.insert(chats).values({
        teamId: teamId,
        instanceId: instance.id,
        remoteJid: jid,
        name: name,
        lastMessageText: 'Demo message ' + i,
        lastMessageTimestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30), // Random within 30 days
        unreadCount: i % 5 === 0 ? 1 : 0,
      }).returning();

      // Create contact
      const [contact] = await db.insert(contacts).values({
        teamId: teamId,
        chatId: chat.id,
        name: name,
        assignedUserId: user.id, // Assign to current user
        funnelStageId: createdStages[i % createdStages.length].id,
      }).returning();

      // Add messages spread across 30 days for analytics heatmap
      const messageCount = 5 + Math.floor(Math.random() * 10);
      const messageValues = [];
      for (let j = 0; j < messageCount; j++) {
        const randomDaysAgo = Math.floor(Math.random() * 30);
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - randomDaysAgo);
        
        messageValues.push({
          id: `demo_msg_${i}_${j}`,
          chatId: chat.id,
          fromMe: j % 2 === 0,
          text: `Sample message ${j} from ${name}`,
          timestamp: timestamp,
          messageType: 'conversation',
        });
      }
      await db.insert(messages).values(messageValues);

      // Add random tag
      if (createdTags.length > 0 && i % 2 === 0) {
        await db.insert(contactTags).values({
          contactId: contact.id,
          tagId: createdTags[i % createdTags.length].id,
        });
      }
    }

    return Response.json({ success: true, message: `Successfully seeded 25 chats and contacts for team ${teamId}. Analytics should now be populated.` });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
