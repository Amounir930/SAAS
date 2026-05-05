
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { messages, chats, evolutionInstances, messageReactions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { pusherServer } from '@/lib/pusher-server';
import { getWhatsAppProvider } from '@/lib/whatsapp/provider-factory';

/**
 * Expert Reaction Route
 * Unified handling for Meta Cloud and Evolution via the Provider Abstraction Layer.
 */
export async function POST(request: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { messageId, emoji, remoteJid, instanceId } = await request.json();

    if (!messageId || !remoteJid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- Forensic Audit: Verify Ownership & State ---
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
      columns: { id: true, chatId: true, fromMe: true },
    });

    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, message.chatId), eq(chats.teamId, team.id)),
      columns: { id: true, instanceId: true },
    });

    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    const resolvedInstanceId = instanceId || chat.instanceId;
    const instance = await db.query.evolutionInstances.findFirst({
      where: eq(evolutionInstances.id, resolvedInstanceId),
    });

    if (!instance) return NextResponse.json({ error: 'Instance not configured' }, { status: 400 });

    // --- UNIFIED PROVIDER EXECUTION ---
    // FIXED: Removed manual fetch. Now using the provider abstraction for ALL integrations.
    const provider = await getWhatsAppProvider({
      id: instance.id,
      instanceName: instance.instanceName,
      accessToken: instance.accessToken || '',
      integration: instance.integration as any,
      metaToken: instance.metaToken,
      metaPhoneNumberId: instance.metaPhoneNumberId,
    });

    const result = await provider.sendReaction(remoteJid, {
      messageId,
      emoji: emoji || '',
      fromMe: message.fromMe,
    });

    if (!result.success) {
      console.error(`[ExpertLog] Reaction failed: ${result.error}`, result.raw);
      return NextResponse.json({ error: result.error || 'Failed to send reaction' }, { status: 500 });
    }

    // --- DATABASE PERSISTENCE ---
    if (emoji) {
      await db
        .insert(messageReactions)
        .values({
          messageId,
          chatId: message.chatId,
          emoji,
          fromMe: true,
          remoteJid: null,
          timestamp: new Date(),
        })
        .onConflictDoUpdate({
          target: [messageReactions.messageId, messageReactions.fromMe],
          set: { emoji, timestamp: new Date() },
        });
    } else {
      await db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.fromMe, true),
          )
        );
    }

    // --- REAL-TIME UPDATES ---
    await pusherServer.trigger(`team-${team.id}`, 'message-reaction', {
      messageId,
      chatId: message.chatId,
      emoji: emoji || null,
      fromMe: true,
      remoteJid: null,
      action: emoji ? 'add' : 'remove',
    }).catch(err => console.error('[ExpertLog] Pusher trigger failed:', err));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ExpertLog] CRITICAL ERROR in Reaction Route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
