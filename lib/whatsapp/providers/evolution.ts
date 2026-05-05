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

// --- Configuration ---
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';

/**
 * Expert Evolution API Provider (Hardened)
 * High-fidelity integration with Evolution API v2 standards.
 */
export class EvolutionProvider implements WhatsAppProvider {
  readonly providerType = 'evolution';
  readonly instanceConfig: WhatsAppInstanceConfig;

  constructor(config: WhatsAppInstanceConfig) {
    this.instanceConfig = config;
  }

  /**
   * Sanitizes numbers for Evolution API expectations.
   * Evolution typically prefers numbers without JID suffixes for message endpoints.
   */
  private cleanNumber(remoteJid: string): string {
    return remoteJid.split('@')[0].replace(/\D/g, '');
  }

  /**
   * Unified, Secure Request Wrapper
   */
  private async request(endpoint: string, body: Record<string, any>): Promise<SendResult> {
    try {
      if (!this.instanceConfig.accessToken) {
        throw new Error('API_KEY_MISSING');
      }

      const response = await fetch(
        `${EVOLUTION_API_URL}/message/${endpoint}/${this.instanceConfig.instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.instanceConfig.accessToken,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000), // 30s Security Timeout
        }
      );

      const data = await response.json().catch(() => ({}));
      
      // Evolution Success Detection (Legacy & V2 support)
      const isSuccess = response.ok && (data?.key?.id || data?.status === 'SUCCESS' || response.status === 201);

      if (isSuccess) {
        return { 
          success: true, 
          messageId: data?.key?.id || data?.instance?.instanceId, 
          raw: data 
        };
      }

      return { 
        success: false, 
        error: data?.message || `Evolution_API_Error_${response.status}`, 
        raw: data 
      };
    } catch (error: any) {
      console.error('[EvolutionProvider_Request_Failed]', {
        endpoint,
        error: error.message
      });
      return {
        success: false,
        error: error.message === 'API_KEY_MISSING' ? 'Configuration error' : 'Connection failed',
      };
    }
  }

  async sendText(remoteJid: string, payload: SendTextPayload): Promise<SendResult> {
    return this.request('sendText', {
      number: this.cleanNumber(remoteJid),
      text: payload.text,
      linkPreview: true,
    });
  }

  async sendMedia(remoteJid: string, payload: SendMediaPayload): Promise<SendResult> {
    const body: Record<string, any> = {
      number: this.cleanNumber(remoteJid),
      mediatype: payload.mediaType,
      mimetype: payload.mimetype,
      caption: payload.caption || '',
    };

    if (payload.mediaUrl) {
      body.media = payload.mediaUrl;
    } else if (payload.mediaBase64) {
      body.media = payload.mediaBase64;
    }

    if (payload.mediaType === 'document' && payload.fileName) {
      body.fileName = payload.fileName;
    }

    return this.request('sendMedia', body);
  }

  async sendAudio(remoteJid: string, payload: SendAudioPayload): Promise<SendResult> {
    return this.request('sendWhatsAppAudio', {
      number: this.cleanNumber(remoteJid),
      audio: payload.audioUrl || payload.audioBase64,
      mimetype: payload.mimetype || 'audio/mpeg',
      ptt: payload.ptt ?? true,
    });
  }

  async sendReaction(remoteJid: string, payload: SendReactionPayload): Promise<SendResult> {
    return this.request('sendReaction', {
      key: {
        remoteJid,
        fromMe: payload.fromMe,
        id: payload.messageId,
      },
      reaction: payload.emoji,
    });
  }

  async sendInteractive(remoteJid: string, payload: SendInteractivePayload): Promise<SendResult> {
    return this.request('sendInteractive', {
      number: this.cleanNumber(remoteJid),
      ...payload
    });
  }

  async sendTemplate(remoteJid: string, payload: SendTemplatePayload): Promise<SendResult> {
    // Template support requires specific Evolution logic
    return { success: false, error: 'Templates must be managed via Evolution Hub' };
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      if (!this.instanceConfig.accessToken) return 'error';

      const response = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${this.instanceConfig.instanceName}`,
        {
          headers: { 'apikey': this.instanceConfig.accessToken },
          signal: AbortSignal.timeout(5000),
        }
      );
      const data = await response.json().catch(() => ({}));
      const state = data?.instance?.state || data?.state;
      return state === 'open' ? 'open' : state === 'connecting' ? 'connecting' : 'close';
    } catch {
      return 'error';
    }
  }

  async disconnect(): Promise<void> {
    if (!this.instanceConfig.accessToken) return;
    
    await fetch(`${EVOLUTION_API_URL}/instance/logout/${this.instanceConfig.instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': this.instanceConfig.accessToken },
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }
}
