import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { chats, messages, evolutionInstances } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { formatMessageForFrontend } from '@/lib/db/messages';
import { sendAudioViaProvider } from '@/lib/whatsapp/send-helpers';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";

const convertToMp3 = async (inputBuffer: Buffer, inputMimeType: string): Promise<string> => {
  const tempId = uuidv4();
  const tempDir = os.tmpdir();
  
  let inputExt = 'webm';
  if (inputMimeType.includes('mp4') || inputMimeType.includes('aac')) inputExt = 'mp4';
  else if (inputMimeType.includes('ogg')) inputExt = 'ogg';
  else if (inputMimeType.includes('wav')) inputExt = 'wav';

  const inputPath = path.join(tempDir, `${tempId}.${inputExt}`);
  const outputPath = path.join(tempDir, `${tempId}.mp3`);

  await fs.writeFile(inputPath, inputBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioCodec('libmp3lame')
      .on('end', async () => {
        try {
          const mp3Buffer = await fs.readFile(outputPath);
          const base64 = mp3Buffer.toString('base64');
          await fs.unlink(inputPath).catch(() => {});
          await fs.unlink(outputPath).catch(() => {});
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', async (err) => {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
        reject(err);
      })
      .save(outputPath);
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientJid, audioBase64, audioMimeType, quotedMessageData, instanceId } = body;

    if (!recipientJid || !audioBase64 || !audioMimeType) {
      return NextResponse.json({ error: 'recipientJid, audioBase64 and audioMimeType are required' }, { status: 400 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let activeInstance = null;
    let targetChat = null;
    if (instanceId) {
        activeInstance = await db.query.evolutionInstances.findFirst({
            where: and(eq(evolutionInstances.id, Number(instanceId)), eq(evolutionInstances.teamId, team.id))
        });

        if (activeInstance) {
            targetChat = await db.query.chats.findFirst({
                where: and(
                    eq(chats.teamId, team.id),
                    eq(chats.remoteJid, recipientJid),
                    eq(chats.instanceId, activeInstance.id)
                )
            });
        }
    }

    if (!activeInstance) {
        targetChat = await db.query.chats.findFirst({
            where: and(
                eq(chats.teamId, team.id),
                eq(chats.remoteJid, recipientJid)
            ),
            with: {
                instance: true
            }
        });

        if (targetChat && targetChat.instance) {
            activeInstance = targetChat.instance;
        }
    }

    if (!activeInstance) {
        activeInstance = await db.query.evolutionInstances.findFirst({
            where: eq(evolutionInstances.teamId, team.id)
        });
    }

    if (!activeInstance || !activeInstance.instanceName) {
      return NextResponse.json({ error: 'Nenhuma instância conectada encontrada.' }, { status: 404 });
    }

    const { instanceName, id: dbInstanceId } = activeInstance;
    const accessToken = activeInstance.accessToken || '';

    let finalAudioBase64 = audioBase64;
    let publicMediaUrl: string | null = null;

    try {
        const inputBuffer = Buffer.from(audioBase64, 'base64');
        finalAudioBase64 = await convertToMp3(inputBuffer, audioMimeType);

        const timestamp = Date.now();
        const uniqueId = uuidv4();
        const filename = `${timestamp}-${uniqueId}.mp3`;
        const relativeDirPath = path.join('uploads', 'audio');
        const absoluteDirPath = path.join(process.cwd(), 'public', relativeDirPath);
        const absoluteFilePath = path.join(absoluteDirPath, filename);

        await fs.mkdir(absoluteDirPath, { recursive: true });
        await fs.writeFile(absoluteFilePath, Buffer.from(finalAudioBase64, 'base64'));

        publicMediaUrl = `/${relativeDirPath}/${filename}`;

    } catch (conversionError: any) {
        console.error(`Audio conversion failed: ${conversionError.message}`);
        return NextResponse.json({ error: 'Failed to process audio file.' }, { status: 500 });
    }

    
    // --- EXPERT REFACTOR: Use Unified Dispatcher ---
    const result = await sendAudioViaProvider({
        instanceId: activeInstance.id,
        recipientJid,
        teamId: team.id,
        chatId: targetChat?.id,
        audioBase64: finalAudioBase64,
        audioUrl: publicMediaUrl || undefined,
        quotedMessageData: quotedMessageData || null,
    });

    if (!result.success && !result.messageId.startsWith('err_')) {
      return NextResponse.json({ error: result.error || 'Failed to send audio' }, { status: 500 });
    }

    // Fetch the saved message to return it in the correct format
    const savedMessage = await db.query.messages.findFirst({
        where: eq(messages.id, result.messageId)
    });

    return NextResponse.json(formatMessageForFrontend(savedMessage || {
        id: result.messageId,
        chatId: result.chatId,
        fromMe: true,
        messageType: 'audioMessage',
        text: '🎤 Audio',
        timestamp: new Date(),
        status: result.success ? 'sent' : 'error',
        mediaUrl: publicMediaUrl,
        mediaMimetype: 'audio/mpeg',
        mediaIsPtt: true,
        isInternal: false
    }));

  } catch (error: any) {
    console.error('Error in /api/messages/sendAudio:', error.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}