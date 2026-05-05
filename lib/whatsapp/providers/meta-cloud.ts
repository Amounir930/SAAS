import { z } from 'zod';
import type {
  WhatsAppProvider,
  WhatsAppInstanceConfig,
  SendTextPayload,
  SendMediaPayload,
  SendAudioPayload,
  SendReactionPayload,
  SendInteractivePayload,
  SendTemplatePayload,
  SendResult,
  ConnectionStatus,
} from '../types';

// === Zod Validation Schemas ===
const SendTextPayloadSchema = z.object({
  text: z.string().min(1).max(4096),
  quoted: z.object({ id: z.string() }).optional(),
});

const SendMediaPayloadSchema = z.object({
  mediaType: z.union([z.literal('image'), z.literal('video'), z.literal('document')]),
  mediaUrl: z.string().url().optional(),
  mediaBase64: z.string().optional(),
  caption: z.string().max(1024).optional(),
}).refine(
  (data) => data.mediaUrl || data.mediaBase64,
  { message: 'Either mediaUrl or mediaBase64 must be provided' }
);

const SendAudioPayloadSchema = z.object({
  audioUrl: z.string().url().optional(),
  audioBase64: z.string().optional(),
}).refine(
  (data) => data.audioUrl || data.audioBase64,
  { message: 'Either audioUrl or audioBase64 must be provided' }
);

const SendReactionPayloadSchema = z.object({
  messageId: z.string(),
  emoji: z.string().length(1).optional(),
});

const SendInteractivePayloadSchema = z.object({
  type: z.union([
    z.literal('button'),
    z.literal('list'),
    z.literal('product'),
    z.literal('product_list')
  ]),
  body: z.object({ text: z.string().min(1).max(1024) }),
  header: z.object({
    type: z.literal('text'),
    text: z.string().max(60)
  }).optional(),
  footer: z.object({ text: z.string().max(60) }).optional(),
  action: z.record(z.any()).optional(),
});

const SendTemplatePayloadSchema = z.object({
  templateName: z.string().regex(/^[a-zA-Z0-9_]+$/),
  language: z.string().length(2),
  components: z.array(z.record(z.any())).optional(),
});

/**
 * Hardened Meta Cloud Provider
 * Implements strict type safety and zero-trust input validation.
 */
export class MetaCloudProvider implements WhatsAppProvider {
  readonly providerType = 'meta-cloud';
  readonly instanceConfig: WhatsAppInstanceConfig;
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';

  constructor(config: WhatsAppInstanceConfig) {
    if (!config.metaToken || !config.metaPhoneNumberId) {
      throw new Error('Meta Cloud provider requires metaToken and metaPhoneNumberId');
    }
    this.instanceConfig = config;
  }

  /**
   * Sanitizes phone numbers for Meta Cloud API (E.164-ish digits only)
   */
  private sanitizeJid(remoteJid: string): string {
    const stripped = remoteJid.replace(/\D/g, '');
    if (!stripped || stripped.length < 6 || stripped.length > 15) {
      throw new Error('Invalid phone number format');
    }
    return stripped;
  }

  private async request(
    endpoint: string,
    body: Record<string, any>
  ): Promise<SendResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.instanceConfig.metaPhoneNumberId}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.instanceConfig.metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20000),
        }
      );

      const data = await response.json().catch(() => ({}));

      // Redact sensitive fields from internal storage/raw data
      const safeData = { ...data };
      if (typeof safeData === 'object' && safeData) {
        delete (safeData as any).access_token;
        delete (safeData as any).token;
      }

      if (response.ok) {
        return {
          success: true,
          messageId: data.messages?.[0]?.id,
          raw: process.env.NODE_ENV === 'development' ? safeData : undefined,
        };
      }

      return {
        success: false,
        error: data.error?.message || 'Meta API Error',
        raw: process.env.NODE_ENV === 'development' ? safeData : undefined,
      };
    } catch (error: any) {
      console.error('[MetaProvider_Request_Failed]', {
        message: error.message
      });
      return {
        success: false,
        error: 'Meta Connection Failed',
      };
    }
  }

  async sendText(remoteJid: string, payload: SendTextPayload): Promise<SendResult> {
    const parsed = SendTextPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: `Invalid payload: ${parsed.error.message}` };
    }

    const to = this.sanitizeJid(remoteJid);
    const body: Record<string, any> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: parsed.data.text },
    };

    if (parsed.data.quoted?.id) {
      body.context = { message_id: parsed.data.quoted.id };
    }

    return this.request('messages', body);
  }

  async sendMedia(remoteJid: string, payload: SendMediaPayload): Promise<SendResult> {
    const parsed = SendMediaPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: `Invalid payload: ${parsed.error.message}` };
    }

    const to = this.sanitizeJid(remoteJid);
    const mediaKey = parsed.data.mediaUrl ? 'link' : 'id';
    const mediaValue = parsed.data.mediaUrl || parsed.data.mediaBase64;

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: parsed.data.mediaType,
      [parsed.data.mediaType]: {
        [mediaKey]: mediaValue,
        caption: parsed.data.caption,
      },
    };

    return this.request('messages', body);
  }

  async sendAudio(remoteJid: string, payload: SendAudioPayload): Promise<SendResult> {
    const parsed = SendAudioPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: `Invalid payload: ${parsed.error.message}` };
    }

    const to = this.sanitizeJid(remoteJid);
    const audioKey = parsed.data.audioUrl ? 'link' : 'id';
    const audioValue = parsed.data.audioUrl || parsed.data.audioBase64;

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'audio',
      audio: { [audioKey]: audioValue },
    };

    return this.request('messages', body);
  }

  async sendReaction(remoteJid: string, payload: SendReactionPayload): Promise<SendResult> {
    const parsed = SendReactionPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: `Invalid payload: ${parsed.error.message}` };
    }

    const to = this.sanitizeJid(remoteJid);
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'reaction',
      reaction: {
        message_id: parsed.data.messageId,
        emoji: parsed.data.emoji || '',
      },
    };

    return this.request('messages', body);
  }

  async sendInteractive(remoteJid: string, payload: SendInteractivePayload): Promise<SendResult> {
    const parsed = SendInteractivePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: `Invalid payload: ${parsed.error.message}` };
    }

    const to = this.sanitizeJid(remoteJid);
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: parsed.data.type,
        body: parsed.data.body,
        header: parsed.data.header,
        footer: parsed.data.footer,
        action: parsed.data.action,
      },
    };

    return this.request('messages', body);
  }

  async sendTemplate(remoteJid: string, payload: SendTemplatePayload): Promise<SendResult> {
    const parsed = SendTemplatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: `Invalid payload: ${parsed.error.message}` };
    }

    const to = this.sanitizeJid(remoteJid);
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: parsed.data.templateName,
        language: { code: parsed.data.language },
        components: parsed.data.components || [],
      },
    };

    return this.request('messages', body);
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    // Meta Cloud API is stateless; if credentials are valid, it's considered 'open'
    return 'open';
  }

  async disconnect(): Promise<void> {
    // No-op for stateless Meta Cloud API
  }
}
