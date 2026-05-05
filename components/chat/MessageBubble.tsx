
'use client';

import React from 'react';
import { format } from 'date-fns';
import { 
  Check, 
  CheckCheck, 
  FileIcon, 
  Download, 
  Play, 
  Pause,
  Image as ImageIcon,
  FileText,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from './types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  onReply?: (message: Message) => void;
  onImageClick?: (url: string) => void;
  onDownload?: (media: any) => void;
  onRetry?: (message: Message) => void;
  onReact?: (emoji: string) => void;
}

export function MessageBubble({
  message,
  showAvatar = true,
  onReply,
  onImageClick,
  onDownload
}: MessageBubbleProps) {
  const isMe = message.fromMe;
  const timestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);

  const renderStatus = () => {
    if (!isMe) return null;
    switch (message.status) {
      case 'pending': return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent': return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-primary" />;
      case 'failed': return <span className="text-destructive text-[10px]">!</span>;
      default: return null;
    }
  };

  const renderQuotedMessage = (quoted: Message) => (
    <div 
      className={cn(
        "mb-2 p-2 rounded-md border-l-4 bg-muted/50 cursor-pointer",
        isMe ? "border-primary" : "border-muted-foreground"
      )}
      onClick={() => onReply?.(quoted)}
    >
      <div className="text-xs font-semibold">
        {quoted.fromMe ? 'You' : quoted.senderName || 'Contact'}
      </div>
      <div className="text-xs line-clamp-2 opacity-80">
        {quoted.type === 'text' ? quoted.body : quoted.type}
      </div>
    </div>
  );

  const renderMedia = () => {
    if (!message.media) return null;

    switch (message.type) {
      case 'image':
        return (
          <div 
            className="relative rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => onImageClick?.(message.media!.url)}
          >
            <img 
              src={message.media.url} 
              alt={message.media.name || 'Image'} 
              className="max-w-full h-auto object-cover max-h-80 transition-transform group-hover:scale-105"
            />
            {message.media.caption && (
              <p className="p-2 text-sm">{message.media.caption}</p>
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video src={message.media.url} className="max-w-full h-full" />
            <Button size="icon" variant="ghost" className="absolute text-white">
              <Play className="h-10 w-10 fill-current" />
            </Button>
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg min-w-[200px]">
            <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0">
              <Play className="h-4 w-4" />
            </Button>
            <div className="flex-1 h-1 bg-muted-foreground/20 rounded-full relative">
              <div className="absolute inset-y-0 left-0 w-0 bg-primary rounded-full" />
            </div>
            <span className="text-[10px] text-muted-foreground">0:00</span>
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border">
            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
              <FileIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.media.name || 'Document'}</p>
              <p className="text-[10px] text-muted-foreground">
                {message.media.size ? (message.media.size / 1024 / 1024).toFixed(2) + ' MB' : 'File'}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDownload?.(message.media)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "flex w-full mb-4",
      isMe ? "justify-end" : "justify-start"
    )}>
      {!isMe && showAvatar && (
        <Avatar className="h-8 w-8 me-2 mt-auto">
          <AvatarImage src={message.senderPhoto} />
          <AvatarFallback>{message.senderName?.[0] || 'C'}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[85%] md:max-w-[70%] lg:max-w-[60%] flex flex-col",
        isMe ? "items-end" : "items-start"
      )}>
        {!isMe && message.isGroup && (
          <span className="text-[10px] font-medium text-muted-foreground mb-1 ms-2">
            {message.senderName}
          </span>
        )}

        <div className={cn(
          "relative p-3 rounded-2xl shadow-sm",
          isMe 
            ? "bg-primary text-primary-foreground rounded-tr-none" 
            : "bg-card text-card-foreground border rounded-tl-none"
        )}>
          {message.quotedMessage && renderQuotedMessage(message.quotedMessage)}
          {renderMedia()}
          {message.body && (
            <p className={cn("text-sm whitespace-pre-wrap leading-relaxed", message.media && "mt-2")}>
              {message.body}
            </p>
          )}

          <div className={cn(
            "flex items-center gap-1 mt-1 justify-end",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <span className="text-[10px]">
              {format(timestamp, 'HH:mm')}
            </span>
            {renderStatus()}
          </div>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className={cn(
            "flex gap-1 -mt-2 z-10",
            isMe ? "me-2" : "ms-2"
          )}>
            {message.reactions.map((r, i) => (
              <div key={i} className="bg-muted border rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                {r.emoji} <span className="text-[10px] opacity-70">{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
