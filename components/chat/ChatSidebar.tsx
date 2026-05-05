"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Tag, 
  ChevronRight, 
  Phone, 
  Briefcase,
  Clock,
  AlertCircle
} from "lucide-react";
import { ChatDetails, ChatDetailsSchema } from "./types";
import { logger } from "@/lib/logger";

interface ChatSidebarProps {
  chat: ChatDetails | null;
}

export function ChatSidebar({ chat }: ChatSidebarProps) {
  // 1. Handle Null State
  if (!chat) return (
    <div className="w-80 border-l bg-card flex items-center justify-center text-muted-foreground p-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <User className="h-12 w-12 opacity-20" />
        <p className="text-sm">Select a chat to view details</p>
      </div>
    </div>
  );

  // 2. Validation Boundary
  const validation = ChatDetailsSchema.safeParse(chat);
  if (!validation.success) {
    logger.error('[ChatSidebar_Validation_Error]', { error: validation.error.format(), chat });
    return (
      <div className="w-80 border-l bg-card flex items-center justify-center text-destructive p-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-12 w-12 opacity-20" />
          <p className="text-sm font-medium">Invalid Chat Data</p>
          <p className="text-xs opacity-70">The chat metadata failed security validation.</p>
        </div>
      </div>
    );
  }

  const validatedChat = validation.data;

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 mb-4 border-2 border-primary/10">
            <AvatarImage src={validatedChat.profilePicUrl || validatedChat.photo || undefined} />
            <AvatarFallback className="text-2xl">
              {validatedChat.name?.substring(0, 2).toUpperCase() || 'UN'}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold line-clamp-1">{validatedChat.name || 'Unknown Contact'}</h2>
          <p className="text-sm text-muted-foreground mb-4">{validatedChat.remoteJid}</p>
          
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <Badge variant="secondary" className="px-3 py-1">
              <Clock className="h-3 w-3 mr-1" />
              {validatedChat.funnelStage || 'New Lead'}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <User className="h-3 w-3" />
              Contact Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Phone</p>
                  <p className="text-muted-foreground">{validatedChat.remoteJid.split('@')[0]}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Department</p>
                  <p className="text-muted-foreground">{validatedChat.department || 'Not Assigned'}</p>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Tag className="h-3 w-3" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {(validatedChat.tags || ['Customer', 'WhatsApp']).map((tag) => (
                <Badge key={tag} variant="outline" className="bg-muted/30">
                  {tag}
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
                + Add Tag
              </Button>
            </div>
          </section>
        </div>
      </ScrollArea>
      
      <div className="p-4 bg-muted/30 border-t">
        <Button className="w-full" variant="outline">
          View Full Profile
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
