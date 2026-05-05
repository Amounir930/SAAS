import { z } from 'zod';

export const MessageTypeSchema = z.enum(['text', 'image', 'video', 'audio', 'document', 'location', 'vcard', 'template']);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const MessageMediaSchema = z.object({
  url: z.string().url(),
  name: z.string().optional(),
  size: z.number().positive().optional(),
  type: z.string().regex(/^[a-z]+\/[a-z0-9.-]+$/).optional(),
  caption: z.string().optional(),
});
export type MessageMedia = z.infer<typeof MessageMediaSchema>;

export const ChatDetailsSchema = z.object({
  id: z.string(),
  jid: z.string(),
  remoteJid: z.string(),
  name: z.string(),
  photo: z.string().optional(),
  profilePicUrl: z.string().optional(),
  isGroup: z.boolean(),
  unreadCount: z.number().int().nonnegative(),
  lastMessage: z.string().optional(),
  lastTimestamp: z.union([z.number(), z.date()]).optional(),
  funnelStage: z.string().optional(),
  department: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type ChatDetails = z.infer<typeof ChatDetailsSchema>;

export interface Message {
  id: string;
  chatId: number;
  jid: string;
  fromMe: boolean;
  type: MessageType;
  body?: string;
  text?: string | null;
  media?: MessageMedia;
  mediaUrl?: string | null;
  mediaMimetype?: string | null;
  mediaCaption?: string | null;
  timestamp: number | Date;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'error';
  senderName?: string;
  senderPhoto?: string;
  isGroup?: boolean;
  participant?: string;
  quotedMessage?: Message;
  quotedMessageId?: string | null;
  quotedMessageText?: string | null;
  reactions?: Array<Reaction>;
  isAi?: boolean;
  isAutomation?: boolean;
  errorMessage?: string | null;
  messageType?: string;
}

export interface Reaction {
  id?: string | number;
  emoji: string;
  count: number;
  fromMe?: boolean;
  remoteJid?: string | null;
  participantName?: string | null;
}

export interface QuickReply {
  id: string;
  text: string;
  shortcut?: string;
  content: string;
  keyword?: string;
}

export interface NewMessagePayload {
  id?: string;
  body: string;
  text?: string;
  type: MessageType;
  media?: MessageMedia;
  instanceId?: number;
  remoteJid?: string;
  fromMe?: boolean;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: number | Date;
  emoji?: string;
}

export interface ContactData {
  id: string;
  name: string;
  phoneNumber: string;
  photo?: string;
}

export interface TeamData {
  id: string;
  name: string;
}

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error' | 'review' | 'sending';

export interface UserData {
  id: string;
  name: string;
  email: string;
  photo?: string;
}

export interface ChatInputProps {
  onSendMessage: (body: string, type: MessageType, mediaType?: 'image' | 'video' | 'audio' | 'document', media?: MessageMedia) => void;
  disabled?: boolean;
  placeholder?: string;
  showVoiceNote?: boolean;
  onVoiceRecorded?: (blob: Blob) => void;
  isRecording?: boolean;
  onStopRecording?: () => void;
  quotedMessage?: Message | null;
  onRemoveQuote?: () => void;
  isInternalNote?: boolean;
  setIsInternalNote?: (val: boolean) => void;
  newMessage?: string;
  setNewMessage?: (val: string) => void;
  isGroup?: boolean;
}
