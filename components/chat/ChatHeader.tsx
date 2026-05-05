'use client';

import React from 'react';
import { X, Users, Phone, Video, MoreVertical, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  chatName: string;
  chatAvatar?: string;
  isGroup: boolean;
  onBack: () => void;
  onToggleSearch: () => void;
  showSearch: boolean;
  onAudioCall: () => void;
  onVideoCall: () => void;
}

export function ChatHeader({
  chatName,
  chatAvatar,
  isGroup,
  onBack,
  onToggleSearch,
  showSearch,
  onAudioCall,
  onVideoCall
}: ChatHeaderProps) {
  const t = useTranslations('Chat');
  const { resolvedTheme } = useTheme();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 border-b",
      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "sticky top-0 z-10"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={onBack}
        aria-label={t('back')}
      >
        <X className="h-5 w-5" />
      </Button>

      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={chatAvatar || undefined} alt={chatName} />
        <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold truncate">{chatName}</h2>
        <div className="flex items-center gap-1">
          <div className={cn(
            "h-2 w-2 rounded-full",
            isGroup ? "bg-blue-500" : "bg-green-500"
          )} />
          <p className="text-xs text-muted-foreground truncate">
            {isGroup ? t('group') : t('connected')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSearch}
          aria-label={showSearch ? t('hideSearch') : t('search')}
          className={showSearch ? "text-primary" : ""}
        >
          <Search className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('moreOptions')}>
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onAudioCall}>
              <Phone className="mr-2 h-4 w-4" />
              <span>{t('audioCall')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onVideoCall}>
              <Video className="mr-2 h-4 w-4" />
              <span>{t('videoCall')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              <span>{isGroup ? t('groupInfo') : t('contactInfo')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}