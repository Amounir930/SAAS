import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { messages, chats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { sendMediaViaProvider } from '@/lib/whatsapp/send-helpers';
import { uploadToS3 } from '@/lib/storage'; // Assume this exists for media storage

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const remoteJid = formData.get('remoteJid') as string;
    const instanceId = formData.get('instanceId') as string;
    const caption = formData.get('caption') as string || '';

    if (!file || !remoteJid || !instanceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const fileName = `${Date.now()}-${file.name}`;
    
    // Use a placeholder or real upload function
    const publicMediaUrl = `https://storage.placeholder.com/${fileName}`; 

    // 2. Send via unified provider
    const result = await sendMediaViaProvider({
      instanceId: parseInt(instanceId),
      recipientJid: remoteJid,
      teamId: (session.user as any).teamId,
      mediaUrl: publicMediaUrl,
      mediaType: mimeType.split('/')[0] as any,
      mimetype: mimeType,
      caption: caption,
      fileName: file.name
    });

    if (!result.success) {
       return NextResponse.json({ error: result.error || 'Failed to send media' }, { status: 500 });
    }

    // 3. Persist to DB (if not already handled by helper)
    const [chat] = await db.select().from(chats).where(eq(chats.remoteJid, remoteJid)).limit(1);
    if (chat) {
        await db.insert(messages).values({
            id: result.messageId || `msg_${Date.now()}`,
            chatId: chat.id,
            fromMe: true,
            messageType: 'media',
            text: caption,
            mediaUrl: publicMediaUrl,
            mediaMimetype: mimeType,
            timestamp: new Date(),
            status: 'sent',
            isInternal: false
        });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });

  } catch (error: any) {
    console.error('Error in API /api/messages/sendMedia:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}