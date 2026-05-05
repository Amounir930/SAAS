import { db } from '@/lib/db/drizzle';
import { messages, chats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { pusherServer } from '@/lib/pusher-server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// === Validation Schemas ===

const CreateSystemMessageSchema = z.object({
  teamId: z.number().int().positive(),
  chatId: z.number().int().positive(),
  text: z.string().min(1),
});

type CreateSystemMessageInput = z.infer<typeof CreateSystemMessageSchema>;

export type ActionState<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// === Core Logic ===

/**
 * Creates a system message within a chat and synchronizes state via Pusher.
 * Hardened with atomic transactions and input validation.
 */
export async function createSystemMessage(
  teamId: number,
  chatId: number,
  text: string
): Promise<ActionState<any>> {
  try {
    // 1. Validation
    CreateSystemMessageSchema.parse({ teamId, chatId, text });

    const messageId = `system_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date();

    // 2. Atomic Transaction
    const result = await db.transaction(async (tx) => {
      const [newMessage] = await tx.insert(messages).values({
        id: messageId,
        chatId,
        fromMe: true,
        messageType: 'system', 
        text,
        timestamp,
        status: 'read',
        isInternal: true,
      }).returning();

      const chat = await tx.query.chats.findFirst({
        where: eq(chats.id, chatId),
        columns: { remoteJid: true, instanceId: true }
      });

      if (chat) {
        await tx.update(chats).set({
          lastMessageTimestamp: timestamp,
        }).where(eq(chats.id, chatId));

        const channelName = `team-${teamId}`;
        
        // Pusher triggers are outside the DB transaction's direct rollback, 
        // but we only trigger if the updates succeeded so far.
        try {
          await pusherServer.trigger(channelName, 'new-message', {
            ...newMessage,
            timestamp: timestamp.toISOString(),
            remoteJid: chat.remoteJid,
          });

          await pusherServer.trigger(channelName, 'chat-list-update', {
            id: chatId,
            lastMessageTimestamp: timestamp.toISOString(),
            remoteJid: chat.remoteJid,
            unreadCount: 0
          });
        } catch (pusherError: any) {
          logger.error('[Pusher_Sync_Error]', { error: pusherError.message, teamId, chatId });
          // We don't necessarily rollback the DB for a Pusher failure, but we log it.
        }
      }

      return newMessage;
    });

    return { success: true, data: result };
  } catch (error: any) {
    logger.error('[CreateSystemMessage_Fatal]', { error: error.message, teamId, chatId });
    return { success: false, error: 'Failed to create system message' };
  }
}