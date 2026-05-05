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

// === Validation Schemas ===
const WhatsAppJidSchema = z.string().regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid WhatsApp JID');

const SendTextPayloadSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty'),
});

const SendMediaPayloadSchema = z.object({
  mediaUrl: z.string().url('Invalid media URL').optional(),
  mediaBase64: z.string().optional(),
  caption: z.string().optional(),
});

const SendAudioPayloadSchema = z.object({
  audioUrl: z.string().url('Invalid audio URL').optional(),
  audioBase64: z.string().optional(),
});

const SendTemplatePayloadSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
  language: z.string().optional().default('en'),
  components: z.array(z.unknown()).optional().default([]),
});

/**
 * Hardened Twilio WhatsApp Provider
 * Implements strict Zod validation and secure credential management.
 */
export class TwilioProvider implements WhatsAppProvider {
  readonly providerType = 'twilio';
  readonly instanceConfig: WhatsAppInstanceConfig;
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;

  constructor(config: WhatsAppInstanceConfig) {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      throw new Error('Twilio provider requires twilioAccountSid and twilioAuthToken');
    }
    this.instanceConfig = config;
    this.accountSid = config.twilioAccountSid;
    this.authToken = config.twilioAuthToken;
    this.fromNumber = `whatsapp:${config.instanceName}`;
  }

  private getAuthHeader(): string {
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    return `Basic ${auth}`;
  }

  private async request(body: URLSearchParams): Promise<SendResult> {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body,
          signal: AbortSignal.timeout(20000),
        }
      );

      const data = await response.json().catch(() => ({}));

      // Redact sensitive data from internal logs/responses
      const safeData = { ...data };
      if (typeof safeData === 'object' && safeData) {
        delete (safeData as any).auth_token;
      }

      if (response.ok) {
        return {
          success: true,
          messageId: data.sid,
          raw: process.env.NODE_ENV === 'development' ? safeData : undefined,
        };
      }

      return {
        success: false,
        error: data.message || 'Twilio API Error',
        code: data.code ? String(data.code) : undefined,
        raw: process.env.NODE_ENV === 'development' ? safeData : undefined,
      };
    } catch (error: any) {
      console.error('[TwilioProvider_Request_Failed]', {
        message: error.message
      });
      return {
        success: false,
        error: 'Twilio Connection Failed',
        code: 'NETWORK_ERROR',
      };
    }
  }

  async sendText(remoteJid: string, payload: SendTextPayload): Promise<SendResult> {
    try {
      WhatsAppJidSchema.parse(remoteJid);
      const { text } = SendTextPayloadSchema.parse(payload);

      const to = `whatsapp:${remoteJid.split('@')[0]}`;
      const body = new URLSearchParams({
        To: to,
        From: this.fromNumber,
        Body: text,
      });

      return this.request(body);
    } catch (error: any) {
      return { success: false, error: error.message, code: 'VALIDATION_ERROR' };
    }
  }

  async sendMedia(remoteJid: string, payload: SendMediaPayload): Promise<SendResult> {
    try {
      WhatsAppJidSchema.parse(remoteJid);
      const parsed = SendMediaPayloadSchema.parse(payload);

      const to = `whatsapp:${remoteJid.split('@')[0]}`;
      const body = new URLSearchParams();
      body.append('To', to);
      body.append('From', this.fromNumber);

      if (parsed.mediaUrl) body.append('MediaUrl', parsed.mediaUrl);
      if (parsed.caption) body.append('Body', parsed.caption);

      return this.request(body);
    } catch (error: any) {
      return { success: false, error: error.message, code: 'VALIDATION_ERROR' };
    }
  }

  async sendAudio(remoteJid: string, payload: SendAudioPayload): Promise<SendResult> {
    try {
      WhatsAppJidSchema.parse(remoteJid);
      const { audioUrl } = SendAudioPayloadSchema.parse(payload);

      if (!audioUrl) throw new Error('Audio URL is required for Twilio');

      const to = `whatsapp:${remoteJid.split('@')[0]}`;
      const body = new URLSearchParams({
        To: to,
        From: this.fromNumber,
        MediaUrl: audioUrl,
      });

      return this.request(body);
    } catch (error: any) {
      return { success: false, error: error.message, code: 'VALIDATION_ERROR' };
    }
  }

  async sendReaction(remoteJid: string, payload: SendReactionPayload): Promise<SendResult> {
    return {
      success: false,
      error: 'Reactions are not natively supported in Twilio WhatsApp API.',
      code: 'UNSUPPORTED_OPERATION',
    };
  }

  async sendInteractive(remoteJid: string, payload: SendInteractivePayload): Promise<SendResult> {
    return {
      success: false,
      error: 'Interactive messages via Twilio require pre-approved templates.',
      code: 'UNSUPPORTED_OPERATION',
    };
  }

  async sendTemplate(remoteJid: string, payload: SendTemplatePayload): Promise<SendResult> {
    try {
      WhatsAppJidSchema.parse(remoteJid);
      const { templateName } = SendTemplatePayloadSchema.parse(payload);

      const to = `whatsapp:${remoteJid.split('@')[0]}`;
      const body = new URLSearchParams({
        To: to,
        From: this.fromNumber,
        // Twilio requires TemplateSid/ContentSid for real templates
        // This is a placeholder for basic body-based template signaling
        Body: `Template: ${templateName}`, 
      });

      return this.request(body);
    } catch (error: any) {
      return { success: false, error: error.message, code: 'VALIDATION_ERROR' };
    }
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    // Twilio API is stateless; if credentials were validated in constructor, it's 'open'
    return 'open';
  }

  async disconnect(): Promise<void> {
    // Stateless
  }
}
