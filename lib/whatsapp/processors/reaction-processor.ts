import { db } from '@/lib/db/drizzle';
import { messages, messageReactions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { pusherServer } from '@/lib/pusher-server';

export async function processReaction(
    teamId: number,
    pusherChannel: string,
    messageData: any,
    remoteJid: string,
    participantJid: string | null
) {
    const reactionMsg = messageData.message?.reactionMessage;
    if (!reactionMsg) return;

    const targetMessageId = reactionMsg.key?.id;
    const reactionEmoji = reactionMsg.text || '';
    const isFromMe = messageData.key.fromMe;
    const reactorJid = isFromMe ? null : (participantJid || remoteJid);
    const reactorName = isFromMe ? null : (messageData.pushName || null);

    if (!targetMessageId) return;

    const targetMsg = await db.query.messages.findFirst({
        where: eq(messages.id, targetMessageId),
        columns: { id: true, chatId: true },
    });

    if (!targetMsg) return;

    if (reactionEmoji) {
        await db.insert(messageReactions).values({
            messageId: targetMessageId,
            chatId: targetMsg.chatId,
            emoji: reactionEmoji,
            fromMe: isFromMe,
            remoteJid: reactorJid,
            participantName: reactorName,
            timestamp: new Date(),
        }).onConflictDoUpdate({
            target: [messageReactions.messageId, messageReactions.remoteJid, messageReactions.fromMe],
            set: { emoji: reactionEmoji, timestamp: new Date() },
        });
    } else {
        await db.delete(messageReactions).where(
            and(
                eq(messageReactions.messageId, targetMessageId),
                isFromMe
                    ? eq(messageReactions.fromMe, true)
                    : eq(messageReactions.remoteJid, reactorJid!),
            )
        );
    }

    await pusherServer.trigger(pusherChannel, 'message-reaction', {
        messageId: targetMessageId,
        chatId: targetMsg.chatId,
        emoji: reactionEmoji || null,
        fromMe: isFromMe,
        remoteJid: reactorJid,
        participantName: reactorName,
        action: reactionEmoji ? 'add' : 'remove',
    }).catch(err => console.error('[Pusher Error] message-reaction:', err.message));
}
