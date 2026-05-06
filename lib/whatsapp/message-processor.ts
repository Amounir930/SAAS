import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { chats, messages } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { pusherServer } from '@/lib/pusher-server';
import { processAutomation } from '@/lib/automation/engine';
import { scheduleAIProcessing } from '@/lib/plugins/ai-chat/service';

// --- Validation Schemas ---
export const IncomingMessageSchema = z.object({
  id: z.string(),
  remoteJid: z.string(),
  fromMe: z.boolean(),
  text: z.string(),
  timestamp: z.date().or(z.string().transform(val => new Date(val))),
  messageType: z.string(),
  pushName: z.string().optional(),
  instanceId: z.number().int(),
  teamId: z.number().int(),
  mediaDetails: z.record(z.string(), z.any()).optional(),
  participant: z.string().optional(),
});

export type IncomingMessage = z.infer<typeof IncomingMessageSchema>;

/**
 * Expert Unified Message Processor (Hardened)
 * Handles persistence, real-time updates, and automation triggers.
 */
export async function processIncomingMessage(rawMsg: unknown) {
  try {
    // 1. Surgical Input Validation
    const parsed = IncomingMessageSchema.safeParse(rawMsg);
    if (!parsed.success) {
      console.error('[MessageProcessor_Validation_Failed]', parsed.error.format());
      return { success: false, error: 'INVALID_PAYLOAD' };
    }
    
    const msg = parsed.data;
    const isGroup = msg.remoteJid.endsWith('@g.us');
    const pusherChannel = `team-${msg.teamId}`;

    let finalChatId: number;

    // 2. Atomic Database Operations (Transaction)
    await db.transaction(async (tx) => {
      const incrementUnread = msg.fromMe ? 0 : 1;
      
      const chatUpdate = {
        lastMessageText: msg.text,
        lastMessageTimestamp: msg.timestamp,
        lastMessageFromMe: msg.fromMe,
        unreadCount: sql`${chats.unreadCount} + ${incrementUnread}`,
        pushName: (!msg.fromMe && msg.pushName) ? msg.pushName : undefined,
        name: (!msg.fromMe && !isGroup && msg.pushName) ? msg.pushName : undefined,
      };

      const [chat] = await tx
        .insert(chats)
        .values({
          teamId: msg.teamId,
          remoteJid: msg.remoteJid,
          instanceId: msg.instanceId,
          name: msg.pushName || msg.remoteJid.split('@')[0],
          lastMessageText: msg.text,
          lastMessageTimestamp: msg.timestamp,
          lastMessageFromMe: msg.fromMe,
          unreadCount: incrementUnread,
        })
        .onConflictDoUpdate({
          target: [chats.teamId, chats.remoteJid, chats.instanceId],
          set: chatUpdate,
        })
        .returning({ id: chats.id });

      finalChatId = chat.id;

      // Sanitized Media Insertion
      const mediaData = msg.mediaDetails || {};
      await tx.insert(messages).values({
        id: msg.id,
        chatId: finalChatId,
        fromMe: msg.fromMe,
        text: msg.text,
        timestamp: msg.timestamp,
        messageType: msg.messageType,
        status: msg.fromMe ? 'sent' : 'delivered',
        participant: msg.participant,
        mediaUrl: typeof mediaData.mediaUrl === 'string' ? mediaData.mediaUrl : null,
        mediaMimetype: typeof mediaData.mediaMimetype === 'string' ? mediaData.mediaMimetype : null,
        mediaCaption: typeof mediaData.mediaCaption === 'string' ? mediaData.mediaCaption : null,
        mediaFileLength: typeof mediaData.mediaFileLength === 'number' ? mediaData.mediaFileLength : null,
      }).onConflictDoNothing();
    });

    // 3. Real-time Signaling (Pusher)
    // Non-blocking triggers outside the transaction
    const pushPayload = { ...msg, chatId: finalChatId!, timestamp: msg.timestamp.toISOString() };
    pusherServer.trigger(pusherChannel, 'new-message', pushPayload).catch(() => {});
    pusherServer.trigger(pusherChannel, 'chat-list-update', {
      id: finalChatId!,
      remoteJid: msg.remoteJid,
      lastMessageText: msg.text,
      lastMessageTimestamp: msg.timestamp.toISOString(),
      lastMessageFromMe: msg.fromMe,
    }).catch(() => {});

    // 4. Automation & AI Triggers
    if (!msg.fromMe && !isGroup) {
      processAutomation(msg.teamId, finalChatId!, msg.remoteJid, msg.text, msg.instanceId)
        .then(handled => {
          if (!handled) scheduleAIProcessing(msg.teamId, finalChatId!, msg.instanceId);
        })
        .catch(e => console.error('[MessageProcessor_Automation_Error]', e.message));
    }

    return { success: true, chatId: finalChatId! };
  } catch (error: any) {
    console.error('[MessageProcessor_Fatal_Error]', error.message);
    return { 
      success: false, 
      error: 'INTERNAL_PROCESSING_FAILURE',
      actionState: 'ERROR',
      errorMessage: error.message
    };
  }
}
