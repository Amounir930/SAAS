import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { chats, messages } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { formatMessageForFrontend } from '@/lib/db/messages';
import { sendTextViaProvider } from '@/lib/whatsapp/send-helpers';
import { SendMessageSchema, type SendMessageInput } from '@/lib/validation/message-send-schema';

/**
 * Standardized ActionState for consistent API responses
 */
type ActionState<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Internal-only message creation (Isolated logic)
 */
async function createInternalMessage(
  chatId: number,
  input: SendMessageInput,
  teamId: number
): Promise<ActionState<{ id: string; chatId: number; text: string; timestamp: string }>> {
  const internalId = `internal_${Date.now()}`;
  const now = new Date();

  const internalMessageData = {
    id: internalId,
    chatId,
    fromMe: true,
    messageType: 'conversation' as const,
    text: input.text,
    timestamp: now,
    status: 'read' as const,
    isInternal: true,
    quotedMessageId: input.quotedMessageData?.id || null,
    quotedMessageText: input.quotedMessageData?.text || null,
  };

  try {
    await db.insert(messages).values(internalMessageData);
    return {
      success: true,
      data: {
        id: internalId,
        chatId,
        text: input.text,
        timestamp: now.toISOString(),
      },
    };
  } catch (error) {
    console.error('[INTERNAL_MESSAGE_INSERT_ERROR]', {
      message: error instanceof Error ? error.message : 'Unknown DB error',
      chatId: 'REDACTED',
      teamId: 'REDACTED',
    });
    return { success: false, error: 'Failed to store internal message', code: 'DB_ERROR' };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let teamId: number | undefined;

  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(
        { success: false, error: 'Empty request body', code: 'BAD_INPUT' },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload', code: 'BAD_INPUT' },
        { status: 400 }
      );
    }

    // 1. Surgical Input Validation
    const parsed = SendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input payload',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input: SendMessageInput = parsed.data;

    // 2. Authentication & Context Resolution
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    teamId = team.id;

    // 3. Dispatch Branching
    if (input.isInternal) {
      const conditions = [eq(chats.teamId, team.id), eq(chats.remoteJid, input.recipientJid)];
      if (input.instanceId) {
        conditions.push(eq(chats.instanceId, input.instanceId));
      } else {
        conditions.push(isNull(chats.instanceId));
      }

      const chat = await db.query.chats.findFirst({
        where: and(...conditions),
      });

      if (!chat) {
        return NextResponse.json(
          { success: false, error: 'Target chat not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      const result = await createInternalMessage(chat.id, input, team.id);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, code: result.code },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: formatMessageForFrontend({
          ...result.data,
          fromMe: true,
          messageType: 'conversation',
          status: 'read',
          isInternal: true,
          chatId: chat.id
        } as any),
      });
    }

    // 4. External Provider Dispatch
    const currentUser = await getUser();
    let finalText = input.text;
    if (currentUser?.enableSignature && currentUser?.name) {
      finalText = `*${currentUser.name}:*\n${input.text}`;
    }

    const sendResult = await sendTextViaProvider({
      instanceId: input.instanceId || undefined,
      recipientJid: input.recipientJid,
      text: finalText,
      teamId: team.id,
      quotedMessageData: input.quotedMessageData || null,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error || 'Failed to dispatch message',
          code: 'PROVIDER_ERROR',
        },
        { status: 500 }
      );
    }

    // 5. Hardened Success Response
    return NextResponse.json({
      success: true,
      data: {
        messageId: sendResult.messageId,
        text: finalText,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[API_MESSAGES_SEND_ERROR]', {
      message: error instanceof Error ? error.message : 'Unknown exception',
      teamId,
    });

    return NextResponse.json(
      { success: false, error: 'An internal server error occurred', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}