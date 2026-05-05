
export type IntegrationType = 'EVOLUTION' | 'META-CLOUD' | 'TWILIO' | 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';

export interface SendTextPayload {
  text: string;
  quoted?: { id: string; text?: string };
}

export interface SendMediaPayload {
  mediaBase64?: string;
  mediaUrl?: string;
  mimetype: string;
  mediaType: 'image' | 'video' | 'document' | 'audio';
  fileName?: string;
  caption?: string;
  quoted?: { id: string; text?: string };
}

export interface SendAudioPayload {
  audioBase64?: string;
  audioUrl?: string;
  mimetype?: string;
  ptt?: boolean;
  quoted?: { id: string; text?: string };
}

export interface SendReactionPayload {
  messageId: string;
  emoji: string;
  fromMe: boolean;
}

export interface SendInteractivePayload {
  type: 'button' | 'list';
  body: { text: string };
  header?: { type: 'text' | 'image' | 'video' | 'document'; text?: string; mediaUrl?: string };
  footer?: { text: string };
  action: {
    buttons?: Array<{ id: string; title: string }>;
    sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
    buttonText?: string;
  };
}

export interface SendTemplatePayload {
  templateName: string;
  language: string;
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{ type: string; [key: string]: any }>;
  }>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  raw?: Record<string, any>;
  timestamp?: number;
}

export type ConnectionStatus = 'open' | 'close' | 'connecting' | 'unknown' | 'error';

export interface WhatsAppInstanceConfig {
  id: number;
  instanceName: string;
  accessToken: string;
  integration: IntegrationType;
  metaToken?: string | null;
  metaPhoneNumberId?: string | null;
  metaBusinessId?: string | null;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
}

export interface WhatsAppProvider {
  readonly providerType: string;
  readonly instanceConfig: WhatsAppInstanceConfig;

  sendText(remoteJid: string, payload: SendTextPayload): Promise<SendResult>;
  sendMedia(remoteJid: string, payload: SendMediaPayload): Promise<SendResult>;
  sendAudio(remoteJid: string, payload: SendAudioPayload): Promise<SendResult>;
  sendReaction(remoteJid: string, payload: SendReactionPayload): Promise<SendResult>;
  sendInteractive(remoteJid: string, payload: SendInteractivePayload): Promise<SendResult>;
  sendTemplate(remoteJid: string, payload: SendTemplatePayload): Promise<SendResult>;
  getConnectionStatus(): Promise<ConnectionStatus>;
  disconnect(): Promise<void>;
}
