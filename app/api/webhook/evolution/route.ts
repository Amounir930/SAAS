import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { evolutionInstances } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { processIncomingMessage } from '@/lib/whatsapp/message-processor';
import { processReaction } from '@/lib/whatsapp/processors/reaction-processor';
import { processMessageStatus } from '@/lib/whatsapp/processors/status-processor';

// --- Validation Schemas ---
const WebhookSchema = z.object({
    instance: z.string().min(1),
    event: z.string(),
    data: z.any().optional(), // We'll refine this inside specific logic
});

interface MessageKey {
    remoteJid?: string;
    remotejid?: string;
    participant?: string;
    participantJid?: string;
    id?: string;
    fromMe?: boolean;
}

interface MessageData {
    key: MessageKey;
    messageType: string;
    message?: any;
    pushName?: string;
    messageTimestamp?: number;
}

// --- Helpers ---
function getBestRemoteJid(key: MessageKey): string {
    return key.remoteJid || key.remotejid || '';
}

function getParticipantJid(key: MessageKey): string | null {
    return key.participant || key.participantJid || null;
}

function getMessagePreview(messageData: MessageData): string {
  const messageType = messageData.messageType;
  const messagePayload = messageData.message;

  if (!messagePayload) return 'New message';

  if (messageType === 'conversation') return messagePayload.conversation || '';
  if (messageType === 'extendedTextMessage') return messagePayload.extendedTextMessage?.text || '';
  
  if (messageType === 'buttonsResponseMessage') {
      return `🔘 ${messagePayload.buttonsResponseMessage?.selectedDisplayText || 'Button Response'}`;
  }
  if (messageType === 'listResponseMessage') {
      return `📝 ${messagePayload.listResponseMessage?.title || 'List Response'}`;
  }
  if (messageType === 'templateButtonReplyMessage') {
      const btn = messagePayload?.templateButtonReplyMessage;
      return `🔘 ${btn?.selectedDisplayText || 'Button Reply'}`;
  }

  const caption = messagePayload?.imageMessage?.caption || 
                  messagePayload?.videoMessage?.caption || 
                  messagePayload?.documentMessage?.caption || null;

  if (messageType === 'imageMessage') return caption ? `📷 ${caption}` : '📷 Image';
  if (messageType === 'audioMessage') return '🎤 Audio';
  if (messageType === 'stickerMessage') return 'Sticker';
  if (messageType === 'videoMessage') return caption ? `📹 ${caption}` : '📹 Video';
  if (messageType === 'documentMessage') {
      const filename = messagePayload?.documentMessage?.fileName || messagePayload?.documentMessage?.filename || 'Document';
      return caption ? `📄 ${caption}` : `📄 ${filename}`;
  }
  if (messageType === 'contactMessage') return `👤 Contact: ${messagePayload?.contactMessage?.displayName || 'Unknown'}`;
  if (messageType === 'contactsArrayMessage') return '👤 Contacts';
  if (messageType === 'locationMessage') return `📍 Location: ${messagePayload?.locationMessage?.name || messagePayload?.locationMessage?.address || 'Unknown'}`;

  return 'New message';
}

export async function POST(request: Request) {
  try {
    const limited = checkRateLimit(`webhook:${getClientIp(request)}`, RATE_LIMITS.webhook);
    if (limited) return limited;

    const rawBody = await request.json();
    const result = WebhookSchema.safeParse(rawBody);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload structure', details: result.error.format() }, { status: 400 });
    }

    const { instance: instanceName, event, data } = result.data;

    const instance = await db.query.evolutionInstances.findFirst({
        where: eq(evolutionInstances.instanceName, instanceName),
        columns: {
            id: true,
            teamId: true
        }
    });

    if (!instance || !instance.teamId) {
        return NextResponse.json({ received: true, ignored: 'unregistered_instance' });
    }

    const teamId = instance.teamId;
    const instanceId = instance.id;
    const pusherChannel = `team-${teamId}`;

    // 1. New Messages (Upsert)
    if (event === 'messages.upsert' && data) {
      const messageData = data as MessageData;
      if (!messageData.key) {
          return NextResponse.json({ error: 'invalid message structure' }, { status: 422 });
      }
      
      const remoteJid = getBestRemoteJid(messageData.key);
      
      // Filter out system/news messages
      if (remoteJid === 'status@broadcast' || remoteJid.endsWith('@newsletter') || remoteJid.includes('@lid')) {
          return NextResponse.json({ received: true, ignored: 'system_broadcast' });
      }

      const isGroup = remoteJid.endsWith('@g.us');
      const participantJid = isGroup ? getParticipantJid(messageData.key) : null;
      const messageType = messageData.messageType;

      // Reactions
      if (messageType === 'reactionMessage' || messageData.message?.reactionMessage) {
          await processReaction(teamId, pusherChannel, messageData, remoteJid, participantJid);
          return NextResponse.json({ success: true, processed: 'reaction' });
      }

      // Skip non-user messages
      if (messageType === 'protocolMessage' || messageType === 'senderKeyDistributionMessage' || !messageData.message) {
          return NextResponse.json({ received: true, ignored: 'protocol_payload' });
      }

      // Standard Messages
      const isFromMe = messageData.key.fromMe || false;
      const messageTimestamp = messageData.messageTimestamp ? new Date(messageData.messageTimestamp * 1000) : new Date();
      const textPreview = getMessagePreview(messageData);

      await processIncomingMessage({
        id: messageData.key.id!,
        remoteJid,
        fromMe: isFromMe,
        text: textPreview,
        timestamp: messageTimestamp,
        messageType: messageData.messageType,
        pushName: messageData.pushName || 'Unknown',
        instanceId: instanceId,
        teamId: teamId,
        mediaDetails: {},
        participant: participantJid || undefined
      });

      return NextResponse.json({ success: true, processed: 'message' });
    } 
    
    // 2. Status Updates
    else if (event === 'messages.update' && data) {
      const updates = Array.isArray(data) ? data : [data];
      for (const updateData of updates) {
          await processMessageStatus(teamId, pusherChannel, updateData, instanceName);
      }
      return NextResponse.json({ success: true, processed: 'status_update' });
    }

    return NextResponse.json({ success: true, event_ignored: event });
  } catch (error: any) {
    console.error('[Evolution Webhook Error]', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}