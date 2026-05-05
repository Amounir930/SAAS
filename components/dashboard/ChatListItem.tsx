'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { MoreHorizontal, BellOff, Clock, User, Tag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import { useRouter } from 'next/navigation';

export type FunnelStage = {
  id: number;
  name: string;
  emoji: string;
};

export type TagData = {
  id: number;
  name: string;
  color: string;
};

export type Agent = {
  id: string;
  name: string | null;
  email: string;
};

export type Chat = {
  id: number;
  remoteJid: string;
  name: string;
  pushName?: string;
  profilePicUrl?: string;
  unreadCount: number;
  lastMessageText?: string;
  lastMessageTimestamp?: string;
  instanceId: number;
  contact?: {
    id: number;
    name?: string;
    funnelStage?: FunnelStage;
    assignedUser?: Agent;
    tags?: TagData[];
  };
};

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  instances: any[];
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (id: number) => void;
  agents: Agent[];
  funnelStages: FunnelStage[];
  tags: TagData[];
  onContactUpdate: (updater?: (chats: Chat[]) => Chat[]) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function ChatListItem({
  chat,
  isActive,
  isSelectionMode,
  isSelected,
  onSelect,
  isMuted,
  onToggleMute
}: ChatListItemProps) {
  const router = useRouter();
  
  const lastMsgTime = chat.lastMessageTimestamp 
    ? formatDistanceToNow(new Date(chat.lastMessageTimestamp), { addSuffix: true })
    : '';

  const initials = (chat.contact?.name || chat.name || 'WA')
    .substring(0, 2)
    .toUpperCase();

  const handleNavigation = () => {
    if (isSelectionMode) return;
    const remoteJidClean = chat.remoteJid.split('@')[0];
    router.push(`/dashboard/chat/${remoteJidClean}?instanceId=${chat.instanceId}`);
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 border-b border-border/50",
        isActive ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50"
      )}
      onClick={handleNavigation}
    >
      {isSelectionMode && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(chat.id)}
          className="mr-1"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          <AvatarImage src={chat.profilePicUrl} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {chat.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
            {chat.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-0.5">
          <h4 className="text-sm font-semibold truncate text-foreground pr-2">
            {chat.contact?.name || chat.name || chat.pushName || chat.remoteJid.split('@')[0]}
          </h4>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
            {lastMsgTime}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5 min-h-[1rem]">
          {chat.lastMessageText || 'No messages yet'}
        </p>

        <div className="flex flex-wrap gap-1 items-center">
          {chat.contact?.funnelStage && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-primary/5 border-primary/20 text-primary">
              <span className="mr-1">{chat.contact.funnelStage.emoji}</span>
              {chat.contact.funnelStage.name}
            </Badge>
          )}
          {chat.contact?.assignedUser && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-1">
              <User className="h-2 w-2" />
              {chat.contact.assignedUser.name || 'Agent'}
            </Badge>
          )}
          {isMuted && <BellOff className="h-3 w-3 text-muted-foreground/50" />}
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleMute(); }}>
              <BellOff className="mr-2 h-4 w-4" />
              {isMuted ? 'Unmute' : 'Mute'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Clock className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="h-12 w-12 bg-muted rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
