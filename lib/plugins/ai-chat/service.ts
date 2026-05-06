import { db } from '@/lib/db/drizzle';
import { aiConfigs, aiSessions, chats, messages, evolutionInstances } from '@/lib/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import { logAIInteraction } from '@/lib/audit/logger';
import { getDynamicTools } from './tools';
import { AIMessage, AIProvider } from './types';
import { pusherServer } from '@/lib/pusher-server';
import { createSystemMessage } from '@/lib/db/system-messages';
import { sendTextViaProvider } from '@/lib/whatsapp/send-helpers';
import { z } from 'zod';

// === Validation Schemas ===
const ProcessAIMessageInputSchema = z.object({
  teamId: z.number().int().positive(),
  chatId: z.number().int().positive(),
  userMessage: z.string().min(1).max(4000).optional(),
  audioUrl: z.string().url().optional().nullable(),
});

const SendAiTextMessageInputSchema = z.object({
  remoteJid: z.string().min(1),
  text: z.string().min(1),
  teamId: z.number().int().positive(),
  chatId: z.number().int().positive(),
  instanceId: z.number().int().positive(),
});

type ActionState<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// === Utilities ===

/**
 * Redacts sensitive keys from objects for secure logging
 */
function redact(obj: any, keys: string[] = ['apikey', 'password', 'secret', 'token']): any {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = JSON.parse(JSON.stringify(obj));
  const walk = (node: any) => {
    if (node && typeof node === 'object') {
      for (const key of Object.keys(node)) {
        if (keys.includes(key.toLowerCase())) {
          node[key] = '[REDACTED]';
        } else {
          walk(node[key]);
        }
      }
    }
  };
  walk(clone);
  return clone;
}

/**
 * Sanitizes AI output to remove system instructions or wrapping quotes
 */
function sanitizeOutput(text: string): string {
  return text
    .replace(/\[SYSTEM_INSTRUCTION\]/g, '')
    .replace(/Output EXACTLY this text: "/g, '')
    .replace(/"$/g, '')
    .trim();
}

/**
 * Hardened message sender for AI responses
 */
async function sendAiTextMessage(input: z.infer<typeof SendAiTextMessageInputSchema>): Promise<ActionState> {
  try {
    const { remoteJid, text, teamId, chatId, instanceId } = SendAiTextMessageInputSchema.parse(input);
    const cleanText = sanitizeOutput(text);
    
    if (!cleanText) return { success: false, error: 'Empty message after sanitization', code: 'EMPTY_MESSAGE' };

    await sendTextViaProvider({
      instanceId,
      recipientJid: remoteJid,
      teamId,
      chatId,
      text: cleanText,
    });

    return { success: true, data: null };
  } catch (error: any) {
    console.error('[AI_SEND_FAILED]', error.message);
    return { success: false, error: 'Failed to send AI message', code: 'SEND_FAILED' };
  }
}

const AI_DEBOUNCE_MS = 5000;
const pendingAIChats = new Map<number, NodeJS.Timeout>();

/**
 * Schedules AI processing with debouncing and structured validation
 */
export function scheduleAIProcessing(teamId: number, chatId: number, instanceId: number): void {
  try {
    const safeChatId = z.number().parse(chatId);
    const existing = pendingAIChats.get(safeChatId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      pendingAIChats.delete(safeChatId);

      try {
        const lastOwnMessage = await db.query.messages.findFirst({
          where: and(eq(messages.chatId, safeChatId), eq(messages.fromMe, true)),
          orderBy: [desc(messages.timestamp)],
          columns: { timestamp: true },
        });

        const pendingWhere = lastOwnMessage
          ? and(eq(messages.chatId, safeChatId), eq(messages.fromMe, false), gt(messages.timestamp, lastOwnMessage.timestamp))
          : and(eq(messages.chatId, safeChatId), eq(messages.fromMe, false));

        const pendingMessages = await db.query.messages.findMany({
          where: pendingWhere,
          orderBy: [messages.timestamp],
          columns: { text: true, mediaUrl: true },
          limit: 20,
        });

        if (pendingMessages.length === 0) return;

        const combinedText = pendingMessages
          .map(m => m.text || '[media]')
          .join('\n');

        const latestMedia = [...pendingMessages].reverse().find(m => m.mediaUrl);

        const aiResult = await processAIMessage(teamId, safeChatId, combinedText, latestMedia?.mediaUrl);

        if (aiResult) {
          const chat = await db.query.chats.findFirst({
            where: eq(chats.id, safeChatId),
            columns: { remoteJid: true },
          });

          if (chat) {
            await sendAiTextMessage({
              remoteJid: chat.remoteJid,
              text: aiResult,
              teamId,
              chatId: safeChatId,
              instanceId
            });
          }
        }
      } catch (e: any) {
        console.error("[Service] AI Debounce Task Failed:", e.message);
      }
    }, AI_DEBOUNCE_MS);

    pendingAIChats.set(safeChatId, timer);
  } catch (error) {
    console.error("[Service] Invalid IDs provided to scheduleAIProcessing");
  }
}

/**
 * Expert AI Processor (Hardened)
 * Implements strict type safety, provider orchestration, and tool execution loop.
 */
export async function processAIMessage(
  teamId: number,
  chatId: number,
  userMessage: string,
  audioUrl?: string | null
): Promise<string | false> {
  try {
    // 1. Input Validation
    ProcessAIMessageInputSchema.parse({ teamId, chatId, userMessage, audioUrl });

    // 2. Fetch Config & Context
    const config = await db.query.aiConfigs.findFirst({
      where: and(eq(aiConfigs.teamId, teamId), eq(aiConfigs.isActive, true))
    });

    if (!config) return false;

    // 🔐 REDACT SENSITIVE DATA FROM LOGS
    const safeConfigLog = redact(config);

    let session = await db.query.aiSessions.findFirst({
      where: eq(aiSessions.chatId, chatId)
    });

    if (!session) {
      const [newSession] = await db.insert(aiSessions).values({
          teamId,
          chatId,
          history: [],
          status: 'active'
      }).returning();
      session = newSession;
    }

    if (session.status !== 'active') return false;

    // 3. Provider Initialization
    let provider: AIProvider;
    const commonConfig = {
      apiKey: config.apiKey, 
      model: config.model,
      systemPrompt: config.systemPrompt || undefined,
      temperature: Number(config.temperature) || 0.7,
      maxOutputTokens: config.maxOutputTokens || 1000,
      attachments: (config.attachments as any[]) || []
    };
    
    if (config.provider === 'openai') {
      provider = new OpenAIProvider(commonConfig);
    } else if (config.provider === 'gemini') {
      provider = new GeminiProvider(commonConfig);
    } else {
      console.error(`[Service] Unsupported provider: ${config.provider}`);
      return false;
    }

    // 4. Transcription Logic (OpenAI)
    let finalInput = userMessage;
    if (config.provider === 'openai' && audioUrl) {
        try {
            const transcription = await provider.transcribeAudio(audioUrl);
            if (transcription) {
               finalInput = `[Audio Transcription]: ${transcription}`;
            }
        } catch (e: any) {
            console.error("[Service] OpenAI Transcription failed", e.message);
        }
    }

    // 5. Build History & Payload
    const history = (session.history as AIMessage[]) || [];
    if (history.length === 0 && config.systemPrompt && config.provider === 'openai') {
        history.push({ role: 'system', content: config.systemPrompt });
    }

    const contentPayload = finalInput || (audioUrl ? "Please listen to this audio and execute any commands requested in it." : "");
    history.push({ 
        role: 'user', 
        content: contentPayload,
        audioUrl: audioUrl || undefined 
    });

    // 6. Tool Resolution
    const teamTools = await getDynamicTools(teamId);

    // 7. AI Execution Loop
    let keepProcessing = true;
    let finalResponseText = '';
    let loopCount = 0;
    const MAX_LOOPS = 5;
    const _aiLogBase = { teamId, chatId };
    const _aiStart = Date.now();

    logAIInteraction({ 
      ..._aiLogBase, 
      eventType: 'ai_request', 
      input: { message: finalInput?.substring(0, 500) }, 
      metadata: { 
        model: config.model, 
        provider: config.provider, 
        historyLength: history.length,
        config: safeConfigLog
      } 
    });

    while (keepProcessing && loopCount < MAX_LOOPS) {
        loopCount++;
        const _loopStart = Date.now();

        const response = await provider.generateResponse(history, teamTools);
        history.push(response);

        logAIInteraction({ 
          ..._aiLogBase, 
          eventType: 'ai_response', 
          output: { content: response.content?.substring(0, 500), hasToolCalls: !!response.toolCalls?.length }, 
          metadata: { model: config.model, loopCount }, 
          durationMs: Date.now() - _loopStart 
        });

        if (response.toolCalls && response.toolCalls.length > 0) {
            for (const toolCall of response.toolCalls) {
                const toolName = toolCall.function.name;
                const tool = teamTools.find(t => t.name === toolName);

                if (tool) {
                    try {
                      const args = JSON.parse(toolCall.function.arguments);
                      const _toolStart = Date.now();
                      const result = await tool.execute(args, { chatId, teamId });

                      logAIInteraction({ 
                        ..._aiLogBase, 
                        eventType: 'ai_tool_call', 
                        input: { tool: toolName, args: redact(args) }, 
                        output: { result: JSON.stringify(result).substring(0, 500) }, 
                        durationMs: Date.now() - _toolStart 
                      });

                      if (tool.name === 'handover_to_human') {
                          await db.update(aiSessions).set({ status: 'paused' }).where(eq(aiSessions.id, session.id));
                          await pusherServer.trigger(`team-${teamId}`, 'chat-status-update', {
                              chatId, type: 'ai', status: 'paused'
                          });
                          const reason = args.reason ? `: ${args.reason}` : '';
                          await createSystemMessage(teamId, chatId, `@@syslog_ai_deactivated|reason=${reason}`);
                          logAIInteraction({ ..._aiLogBase, eventType: 'ai_handover', metadata: { reason: args.reason } });
                      }

                      history.push({
                          role: 'tool',
                          content: JSON.stringify(result),
                          toolCallId: toolCall.id || toolCall.function.name
                      });
                    } catch (toolError: any) {
                      console.error(`[Service] Tool execution error:`, toolError.message);
                      logAIInteraction({ ..._aiLogBase, eventType: 'ai_tool_call', input: { tool: toolName }, status: 'error', error: toolError.message });
                      history.push({
                          role: 'tool',
                          content: JSON.stringify({ error: toolError.message || "Failed to execute tool" }),
                          toolCallId: toolCall.id || toolCall.function.name
                      });
                    }
                } else {
                    history.push({
                          role: 'tool',
                          content: JSON.stringify({ error: "Tool not found" }),
                          toolCallId: toolCall.id || toolCall.function.name
                      });
                }
            }
        } else {
            finalResponseText = response.content || '';
            keepProcessing = false;
        }
    }

    // 8. Session Persistence & Sanitization
    const truncatedHistory = history.slice(-20);
    await db.update(aiSessions)
      .set({ history: truncatedHistory, updatedAt: new Date() })
      .where(eq(aiSessions.id, session.id));

    return sanitizeOutput(finalResponseText);

  } catch (error: any) {
    console.error('[Service_Fatal_Error]', error.message);
    logAIInteraction({
      teamId,
      chatId,
      eventType: 'ai_error',
      error: error.message,
    });
    return false;
  }
}