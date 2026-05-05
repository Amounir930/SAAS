import { NextRequest, NextResponse } from 'next/server';
import { 
  MetaCloudWebhookHandler, 
  type MetaWebhookMessage, 
  type MetaWebhookValue 
} from '@/lib/plugins/meta-cloud/webhook-handler';
import { db } from '@/lib/db/drizzle';
import { evolutionInstances } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { processIncomingMessage } from '@/lib/whatsapp/message-processor';

// --- Validation Schemas ---
const MetaMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string().optional() }).optional(),
});

/**
 * Meta Webhook Route - Hardened Version
 * Implements HMAC signature validation and Zod sanitization.
 */
export async function GET(request: NextRequest) {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    return new Response('Meta verify token not configured', { status: 500 });
  }

  const handler = new MetaCloudWebhookHandler({ verifyToken });
  return handler.verify(request);
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  
  const handler = new MetaCloudWebhookHandler({
    appSecret,
    requireSignatureValidation: !!appSecret,
    
    onMessage: async ({ message, value }: { message: MetaWebhookMessage, value: MetaWebhookValue }) => {
      try {
        // 1. Sanitize incoming message shape
        const validated = MetaMessageSchema.safeParse(message);
        if (!validated.success) {
          console.warn('[Meta-Webhook] Skipping malformed message:', validated.error.format());
          return;
        }

        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) return;

        // 2. Instance & Ownership Verification
        const instance = await db.query.evolutionInstances.findFirst({
          where: eq(evolutionInstances.metaPhoneNumberId, phoneNumberId),
        });

        if (!instance || !instance.teamId) {
          console.warn(`[Meta-Webhook] No registered instance found for phone_number_id: ${phoneNumberId}`);
          return;
        }

        // 3. Process the message safely
        const text = message.text?.body || (message.type !== 'text' ? `${message.type} message` : 'New message');

        await processIncomingMessage({
          id: message.id,
          remoteJid: `${message.from}@s.whatsapp.net`,
          fromMe: false,
          text,
          timestamp: new Date(parseInt(message.timestamp) * 1000),
          messageType: message.type,
          pushName: value.contacts?.[0]?.profile?.name || 'WhatsApp User',
          instanceId: instance.id,
          teamId: instance.teamId,
        });
      } catch (error) {
        console.error('[Meta-Webhook] Error in onMessage callback:', error);
      }
    },

    onStatus: async ({ status }) => {
      try {
        // Redacted logging for sensitive identifiers
        const statusId = status.id?.substring(0, 8) + '...';
        console.info(`[Meta-Webhook] Processing status update: ${status.status} for msg ${statusId}`);
        // Future: implement processMessageStatus for Meta Cloud
      } catch (error) {
        console.error('[Meta-Webhook] Error in onStatus callback:', error);
      }
    }
  });

  return handler.handle(request);
}
