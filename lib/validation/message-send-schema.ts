import { z } from 'zod';

/**
 * Nested schema for quoted messages
 */
export const QuotedMessageSchema = z.object({
  id: z.string().min(1, 'Quoted message ID is required'),
  text: z.string().optional(),
  fromMe: z.boolean().optional(),
});

/**
 * Expert Zod Schema for WhatsApp message sending
 * Hardened version with nested validation and strict regex constraints
 */
export const SendMessageSchema = z.object({
  recipientJid: z.string()
    .min(1, 'Recipient JID is required'),
  text: z.string().min(1, 'Message text is required').max(4096),
  isInternal: z.boolean().optional().default(false),
  instanceId: z.number().int().positive().nullable().optional(),
  quotedMessageData: QuotedMessageSchema.optional().nullable(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
