
import { db } from '@/lib/db/drizzle';
import { chats, messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { pusherServer } from '@/lib/pusher-server';
import { getWhatsAppProvider } from './provider-factory';
import type { WhatsAppInstanceConfig, SendResult, WhatsAppProvider } from './types';

// --- EXPERT REFACTOR: Unified Dispatcher Pattern ---

interface BaseSendParams {
  instance?: WhatsAppInstanceConfig;
  instanceId?: number;
  recipientJid: string;
  teamId: number;
  chatId?: number;
  quotedMessageData?: { id: string; text?: string } | null;
}

interface TextParams extends BaseSendParams { text: string; }
interface MediaParams extends BaseSendParams {
  mediaBase64?: string;
  mediaUrl?: string;
  mimetype: string;
  mediaType: 'image' | 'video' | 'document' | 'audio';
  fileName?: string;
  caption?: string;
}

/**
 * Unified Dispatcher to reduce redundancy and ensure consistent error handling.
 */
async function dispatch(
  params: BaseSendParams,
  sendFn: (provider: WhatsAppProvider) => Promise<SendResult>,
  persistData: { text: string; messageType: string; mediaDetails?: any }
) {
  const provider = await getWhatsAppProvider(params.instanceId || params.instance!);
  if (!provider) throw new Error('Provider not found or not configured');
  const result = await sendFn(provider);

  const finalResult = await persistSendResult({
    result,
    recipientJid: params.recipientJid,
    text: persistData.text,
    messageType: persistData.messageType,
    teamId: params.teamId,
    chatId: params.chatId,
    instanceId: params.instanceId,
    quotedMessageData: params.quotedMessageData,
    mediaDetails: persistData.mediaDetails,
  });

  return finalResult;
}


export async function sendTextViaProvider(params: TextParams) {
  return dispatch(
    params,
    (p) => p.sendText(params.recipientJid, { text: params.text, quoted: params.quotedMessageData || undefined }),
    { text: params.text, messageType: 'conversation' }
  );
}

export async function sendAudioViaProvider(params: BaseSendParams & { audioBase64?: string; audioUrl?: string }) {
  return dispatch(
    params,
    (p) => p.sendAudio(params.recipientJid, {
      audioBase64: params.audioBase64,
      audioUrl: params.audioUrl,
      quoted: params.quotedMessageData || undefined
    }),
    {
      text: '🎤 Audio',
      messageType: 'audioMessage',
      mediaDetails: {
        mediaUrl: params.audioUrl || null,
        mediaMimetype: 'audio/mpeg',
        mediaIsPtt: true,
      }
    }
  );
}

export async function sendMediaViaProvider(params: MediaParams) {
  return dispatch(
    params,
    (p) => p.sendMedia(params.recipientJid, {
      mediaBase64: params.mediaBase64,
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaType,
      mimetype: params.mimetype,
      caption: params.caption,
      fileName: params.fileName,
      quoted: params.quotedMessageData || undefined
    }),
    {
      text: params.caption || params.fileName || `${params.mediaType} message`,
      messageType: `${params.mediaType}Message`,
      mediaDetails: {
        mediaUrl: params.mediaUrl || null,
        mediaMimetype: params.mimetype,
        mediaCaption: params.caption || null,
      }
    }
  );
}

async function persistSendResult(params: {
  result: SendResult;
  recipientJid: string;
  text: string;
  messageType: string;
  teamId: number;
  chatId?: number;
  instanceId?: number;
  instance?: WhatsAppInstanceConfig;
  quotedMessageData?: { id: string; text?: string } | null;
  mediaDetails?: any;
}) {
  const { result, recipientJid, text, messageType, teamId, chatId, quotedMessageData, mediaDetails } = params;
  const instanceId = params.instanceId || (await getWhatsAppProvider(params.instanceId || params.instance!)).instanceConfig.id;

  const isGroupChat = recipientJid.endsWith('@g.us');
  const messageStatus = result.success ? (isGroupChat ? 'delivered' : 'sent') : 'error';
  const messageId = result.success && result.messageId ? result.messageId : `err_${Date.now()}`;
  const timestamp = new Date();

  let finalChatId = chatId;
  let newMessageData: any = null;

  // CRITICAL FIX: Network triggers (Pusher) MUST be outside the DB transaction to prevent locks.
  await db.transaction(async (tx) => {
    if (!finalChatId) {
      const [newChat] = await tx.insert(chats).values({
        teamId,
        remoteJid: recipientJid,
        instanceId,
        name: recipientJid.split('@')[0],
        lastMessageText: text,
        lastMessageTimestamp: timestamp,
        lastMessageFromMe: true,
        unreadCount: 0,
        lastMessageStatus: messageStatus as any,
      }).returning({ id: chats.id });
      finalChatId = newChat.id;
    } else {
      await tx.update(chats).set({
        lastMessageText: text,
        lastMessageTimestamp: timestamp,
        lastMessageFromMe: true,
        unreadCount: 0,
        lastMessageStatus: messageStatus as any,
      }).where(eq(chats.id, finalChatId));
    }

    newMessageData = {
      id: messageId,
      chatId: finalChatId,
      fromMe: true,
      messageType,
      text,
      timestamp,
      status: messageStatus as any,
      quotedMessageId: quotedMessageData?.id || null,
      errorMessage: result.success ? null : result.error,
      ...mediaDetails,
    };

    await tx.insert(messages).values(newMessageData).onConflictDoNothing();
  });

  // ASYNC TRIGGERS: Executed after DB commit to ensure system responsiveness.
  if (newMessageData) {
    const pusherChannel = `team-${teamId}`;
    pusherServer.trigger(pusherChannel, 'new-message', {
      ...newMessageData,
      timestamp: timestamp.toISOString(),
      remoteJid: recipientJid,
    }).catch(err => console.error('[ExpertLog] Pusher trigger failed:', err));
    
    pusherServer.trigger(pusherChannel, 'chat-list-update', {
      id: finalChatId,
      remoteJid: recipientJid,
      lastMessageText: text,
      lastMessageTimestamp: timestamp.toISOString(),
      lastMessageFromMe: true,
      lastMessageStatus: messageStatus,
    }).catch(err => console.error('[ExpertLog] Pusher list update failed:', err));
  }

  return { success: result.success, messageId, chatId: finalChatId, error: result.error };
}
