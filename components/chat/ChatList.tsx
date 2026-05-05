
'use client';

import React from 'react';
import { Search, Filter, MoreVertical, CheckCheck, Check, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface ChatItem {
  id: string;
  jid: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date | number;
  unreadCount: number;
  isGroup: boolean;
  isOnline?: boolean;
  lastMessageStatus?: 'pending' | 'sent' | 'delivered' | 'read';
}

interface ChatListProps {
  chats: ChatItem[];
  selectedId?: string;
  onSelectChat: (chat: ChatItem) => void;
  className?: string;
}

export function ChatList({
  chats,
  selectedId,
  onSelectChat,
  className
}: ChatListProps) {
  const t = useTranslations('Chat');
  const [search, setSearch] = React.useState('');

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(search.toLowerCase()) ||
    (chat.lastMessage || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (date?: Date | number) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(d);
  };

  const renderStatus = (status?: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent': return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-primary" />;
      default: return null;
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-card border-r", className)}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{t('chats')}</h2>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder={t('searchPlaceholder')} 
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="rounded-full px-4 h-8 text-xs">
            {t('all')}
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-4 h-8 text-xs">
            {t('unread')}
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-4 h-8 text-xs">
            {t('groups')}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t('noChatsFound')}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  selectedId === chat.id && "bg-muted shadow-sm"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={chat.avatar} alt={chat.name} />
                    <AvatarFallback>{chat.name[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {chat.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={cn(
                      "text-sm font-semibold truncate",
                      chat.unreadCount > 0 ? "text-foreground" : "text-foreground/90"
                    )}>
                      {chat.name}
                    </h3>
                    <span className={cn(
                      "text-[10px]",
                      chat.unreadCount > 0 ? "text-primary font-bold" : "text-muted-foreground"
                    )}>
                      {formatTime(chat.lastMessageTime)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 flex-1 min-w-0 text-xs text-muted-foreground">
                      {chat.lastMessageStatus && renderStatus(chat.lastMessageStatus)}
                      <p className="truncate line-clamp-1 italic">
                        {chat.lastMessage || t('noMessages')}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="ms-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
