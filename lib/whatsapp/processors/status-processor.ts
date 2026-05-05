import { db } from '@/lib/db/drizzle';
import { messages, chats } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { pusherServer } from '@/lib/pusher-server';

function getStatusWeight(status: string | null): number {
    if (!status) return 0;
    const s = status.toLowerCase();
    if (s === 'error') return -1;
    if (s === 'pending') return 1;
    if (s === 'sent') return 2;
    if (s === 'delivered' || s === 'delivery_ack') return 3;
    if (s === 'read' || s === 'played') return 4;
    return 0;
}

export async function processMessageStatus(
    teamId: number,
    pusherChannel: string,
    updateData: any,
    instanceName: string
) {
    const messageKeyId = updateData.key?.id || updateData.keyId;
    const newApiStatus = updateData.status || updateData.update?.status;

    if (!messageKeyId || !newApiStatus) return;

    let dbStatus: 'sent' | 'delivered' | 'read' | null = null;
    const statusValue = String(newApiStatus).toUpperCase();

    if (statusValue === 'SENT' || statusValue === 'SERVER_ACK' || statusValue === '2') dbStatus = 'sent';
    else if (statusValue === 'DELIVERY_ACK' || statusValue === 'DELIVERED' || statusValue === '3') dbStatus = 'delivered';
    else if (statusValue === 'READ' || statusValue === 'PLAYED' || statusValue === '4' || statusValue === '5') dbStatus = 'read';

    if (!dbStatus) return;

    await db.transaction(async (tx) => {
        const currentMessage = await tx.query.messages.findFirst({
            where: and(
                eq(messages.id, messageKeyId),
                eq(messages.fromMe, true)
            ),
            columns: { id: true, status: true, chatId: true }
        });

        if (!currentMessage) return;

        const currentWeight = getStatusWeight(currentMessage.status);
        const newWeight = getStatusWeight(dbStatus!);

        if (newWeight <= currentWeight) return;

        const [updatedMsg] = await tx.update(messages)
            .set({ status: dbStatus! })
            .where(eq(messages.id, messageKeyId))
            .returning();

        if (!updatedMsg) return;

        const chat = await tx.query.chats.findFirst({
            where: eq(chats.id, currentMessage.chatId),
            columns: { id: true, lastMessageStatus: true, remoteJid: true }
        });

        if (!chat) return;

        // إرسال تحديث الحالة عبر Pusher
        await pusherServer.trigger(pusherChannel, 'message-status-update', {
            messageId: updatedMsg.id,
            status: updatedMsg.status,
            instance: instanceName,
            remoteJid: chat.remoteJid
        }).catch(() => {});

        // تحديث حالة آخر رسالة في المحادثة إذا كانت هي الرسالة المحدثة
        const latestMessage = await tx.query.messages.findFirst({
            where: eq(messages.chatId, chat.id),
            orderBy: [desc(messages.timestamp)],
            columns: { id: true }
        });

        if (latestMessage && latestMessage.id === messageKeyId) {
            const chatCurrentWeight = getStatusWeight(chat.lastMessageStatus);
            if (newWeight > chatCurrentWeight) {
                await tx.update(chats)
                    .set({ lastMessageStatus: dbStatus! })
                    .where(eq(chats.id, chat.id));
            }
        }
    });
}

