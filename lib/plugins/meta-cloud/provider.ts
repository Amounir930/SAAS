
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
} from '../../whatsapp/types';

const META_API_URL = 'https://graph.facebook.com/v21.0';

export class MetaCloudProvider implements WhatsAppProvider {
  readonly providerType = 'meta-cloud';
  readonly instanceConfig: WhatsAppInstanceConfig;
  private phoneNumberId: string;
  private accessToken: string;

  constructor(config: WhatsAppInstanceConfig) {
    this.instanceConfig = config;
    this.phoneNumberId = config.metaPhoneNumberId || config.instanceName;
    this.accessToken = config.accessToken;
  }

  private async request(endpoint: string, body: any): Promise<{ ok: boolean; data: any }> {
    const response = await fetch(`${META_API_URL}/${this.phoneNumberId}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    let data: any;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: `Non-JSON response (${response.status}): ${text.substring(0, 200)}` };
    }

    return { ok: response.ok, data };
  }

  private parseResult(res: { ok: boolean; data: any }): SendResult {
    if (res.ok && (res.data?.messages?.[0]?.id || res.data?.id)) {
      return { 
        success: true, 
        messageId: res.data?.messages?.[0]?.id || res.data?.id, 
        raw: res.data 
      };
    }
    return {
      success: false,
      error: res.data?.error?.message || res.data?.message || 'Unknown Meta API error',
      raw: res.data,
    };
  }

  async sendText(remoteJid: string, payload: SendTextPayload): Promise<SendResult> {
    const to = remoteJid.split('@')[0];
    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: {
        preview_url: true,
        body: payload.text
      }
    };
    return this.parseResult(await this.request('messages', body));
  }

  async sendMedia(remoteJid: string, payload: SendMediaPayload): Promise<SendResult> {
    const to = remoteJid.split('@')[0];
    const type = payload.mediaType === 'audio' ? 'audio' : (payload.mediaType === 'video' ? 'video' : (payload.mediaType === 'image' ? 'image' : 'document'));
    
    const body: any = {
      messaging_product: "whatsapp",
      to: to,
      type: type,
    };

    if (payload.mediaUrl) {
        body[type] = { link: payload.mediaUrl };
        if (payload.caption) body[type].caption = payload.caption;
    } else {
        return { success: false, error: 'Media URL is required for Meta Cloud Provider' };
    }

    return this.parseResult(await this.request('messages', body));
  }

  async sendAudio(remoteJid: string, payload: SendAudioPayload): Promise<SendResult> {
    const to = remoteJid.split('@')[0];
    const body: any = {
      messaging_product: "whatsapp",
      to: to,
      type: "audio",
      audio: { link: payload.audioUrl }
    };
    return this.parseResult(await this.request('messages', body));
  }

  async sendReaction(remoteJid: string, payload: SendReactionPayload): Promise<SendResult> {
    const to = remoteJid.split('@')[0];
    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "reaction",
      reaction: {
        message_id: payload.messageId,
        emoji: payload.emoji
      }
    };
    return this.parseResult(await this.request('messages', body));
  }

  async sendInteractive(remoteJid: string, payload: SendInteractivePayload): Promise<SendResult> {
    const to = remoteJid.split('@')[0];
    
    const interactive: any = {
      type: payload.type === 'button' ? 'button' : 'list',
      body: payload.body,
      action: {}
    };

    if (payload.header) interactive.header = payload.header;
    if (payload.footer) interactive.footer = payload.footer;

    if (payload.type === 'button') {
      interactive.action.buttons = payload.action.buttons?.map(b => ({
        type: 'reply',
        reply: { id: b.id, title: b.title }
      }));
    } else {
      interactive.action.button = payload.action.buttonText || 'Select';
      interactive.action.sections = payload.action.sections;
    }

    const body = {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive
    };

    return this.parseResult(await this.request('messages', body));
  }

  async sendTemplate(remoteJid: string, payload: SendTemplatePayload): Promise<SendResult> {
    const to = remoteJid.split('@')[0];
    const body = {
      messaging_product: "whatsapp",
      to: to,
      type: "template",
      template: {
        name: payload.templateName,
        language: {
          code: payload.language || 'en_US'
        },
        components: payload.components
      }
    };
    return this.parseResult(await this.request('messages', body));
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${META_API_URL}/${this.phoneNumberId}`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok ? 'open' : 'close';
    } catch {
      return 'unknown';
    }
  }

  async disconnect(): Promise<void> {}
}