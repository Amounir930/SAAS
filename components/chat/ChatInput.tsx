'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle, Smile, X } from 'lucide-react';
import { z } from 'zod';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEmojiPicker } from '@/hooks/use-emoji-picker';
import { useClickOutside } from '@/hooks/use-click-outside';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { ChatInputProps } from './types';

// === Validation Schemas ===

const ChatMessageSchema = z.string().min(1).max(4096);

const FileMetadataSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  size: z.number().positive(),
  type: z.string().regex(/^[a-z]+\/[a-z0-9.-]+$/),
});

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  showVoiceNote = true,
  onVoiceRecorded,
  isRecording,
  onStopRecording,
  quotedMessage,
  onRemoveQuote,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    isOpen: showEmojiPicker,
    toggle: toggleEmojiPicker,
    pickerRef: emojiPickerRef,
  } = useEmojiPicker();

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (quotedMessage) {
      textareaRef.current?.focus();
    }
  }, [quotedMessage]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);
    setIsTyping(val.length > 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    try {
      const trimmed = message.trim();
      if (!trimmed) return;

      ChatMessageSchema.parse(trimmed);
      onSendMessage(trimmed, 'text');
      
      setMessage('');
      setIsTyping(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error: any) {
      logger.warn('[ChatInput_Validation_Failed]', { error: error.message });
      toast({
        title: 'Validation Error',
        description: 'Message is too long or invalid.',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB

    files.forEach(file => {
      if (file.size > MAX_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 100MB limit.`,
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const metadata = {
            url: reader.result as string,
            name: file.name,
            size: file.size,
            type: file.type,
          };

          FileMetadataSchema.parse(metadata);

          const type = file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
            ? 'video'
            : 'document';

          onSendMessage('', type, type, metadata);
        } catch (error: any) {
          logger.error('[ChatInput_File_Error]', { error: error.message });
          toast({
            title: 'File Error',
            description: 'Invalid file metadata detected.',
            variant: 'destructive',
          });
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (e.target) e.target.value = '';
  };

  const handleRemoveQuote = () => {
    onRemoveQuote?.();
  };

  // Close emoji picker when clicking outside
  useClickOutside([containerRef as any, emojiPickerRef as any], () => {
    if (showEmojiPicker) {
      toggleEmojiPicker();
    }
  });

  return (
    <div className="flex flex-col w-full bg-background border-t">
      {/* Quote preview */}
      {quotedMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted text-sm">
          <div className="flex-1 truncate">
            <span className="font-medium">
              {quotedMessage.fromMe ? 'You' : quotedMessage.senderName || 'Contact'}
            </span>
            : {quotedMessage.type === 'text' ? quotedMessage.body : quotedMessage.type}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRemoveQuote}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
        <div className="relative flex-1" ref={containerRef}>
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled || isRecording}
            className="resize-none max-h-32 pr-16"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={1}
          />
          
          {/* Emoji button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-10 bottom-1 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleEmojiPicker}
          >
            <Smile className="h-5 w-5" />
          </Button>

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 z-10">
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                width={300}
                height={400}
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>

        {/* File upload button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          disabled={disabled || isRecording}
          asChild
        >
          <label className="cursor-pointer">
            <Paperclip className="h-5 w-5" />
            <input
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              multiple
              onChange={handleFileChange}
              disabled={disabled || isRecording}
            />
          </label>
        </Button>

        {/* Send or voice note button */}
        {isRecording ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onStopRecording}
          >
            <StopCircle className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className={cn(
              'text-muted-foreground hover:text-foreground',
              isTyping && 'text-primary hover:text-primary'
            )}
            disabled={disabled || (!isTyping && !showVoiceNote)}
          >
            {isTyping ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        )}
      </form>
    </div>
  );
}