import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import { evolutionInstances, chats, messages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedTeam } from "@/lib/auth/api";
import { z } from "zod";
import { sendTextViaProvider, sendAudioViaProvider, sendMediaViaProvider } from "@/lib/whatsapp/send-helpers";

const sendSchema = z.object({
  instanceName: z.string().min(1),
  number: z.string().min(1),
  type: z.enum(["text", "image", "video", "document", "audio"]),
  message: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  mimetype: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const team = await getAuthenticatedTeam(req);

    if (!team) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid or missing API Token." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = sendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { instanceName, number, type, message, mediaUrl, fileName, mimetype } = validation.data;

    const instance = await db.query.evolutionInstances.findFirst({
      where: and(
        eq(evolutionInstances.teamId, team.id),
        eq(evolutionInstances.instanceName, instanceName)
      ),
    });

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    const formattedNumber = number.replace(/\D/g, "");
    const remoteJid = `${formattedNumber}@s.whatsapp.net`;
    
    // Find existing chat or create it later in helper
    const chat = await db.query.chats.findFirst({
        where: and(eq(chats.remoteJid, remoteJid), eq(chats.instanceId, instance.id))
    });

    let result;
    if (type === "text") {
        if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });
        result = await sendTextViaProvider({
            instanceId: instance.id,
            recipientJid: remoteJid,
            teamId: team.id,
            chatId: chat?.id,
            text: message
        });
    } else if (type === "audio") {
        if (!mediaUrl) return NextResponse.json({ error: "mediaUrl required" }, { status: 400 });
        result = await sendAudioViaProvider({
            instanceId: instance.id,
            recipientJid: remoteJid,
            teamId: team.id,
            chatId: chat?.id,
            audioUrl: mediaUrl
        });
    } else {
        if (!mediaUrl) return NextResponse.json({ error: "mediaUrl required" }, { status: 400 });
        result = await sendMediaViaProvider({
            instanceId: instance.id,
            recipientJid: remoteJid,
            teamId: team.id,
            chatId: chat?.id,
            mediaUrl: mediaUrl,
            mediaType: type as any,
            mimetype: mimetype || 'application/octet-stream',
            fileName: fileName || 'file'
        });
    }

    if (!result.success) {
        return NextResponse.json({ error: result.error || "Failed to send" }, { status: 500 });
    }

    return NextResponse.json({ 
        success: true, 
        messageId: result.messageId,
        chatId: result.chatId 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { 
        error: "Internal Server Error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}