import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { getMessages, sendMessage, sendAudio, deleteMessage } from '@/lib/api/messages';
import { fetchApi } from '@/lib/api/utils';
import { logger } from '@/lib/logger';

// === Hook Validation Schemas ===

const SendMessageHookSchema = z.object({
  chatId: z.number().int().positive(),
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.string().optional(),
});

const SendAudioHookSchema = z.object({
  chatId: z.number().int().positive(),
  audioUrl: z.string().url(),
});

const DeleteMessageHookSchema = z.string().min(1);

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: () => fetchApi('/api/chats'),
  });
}

export function useMessages(chatId: number, params?: Parameters<typeof getMessages>[1]) {
  return useQuery({
    queryKey: ['messages', chatId, params],
    queryFn: () => getMessages(chatId, params),
    enabled: !!chatId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof SendMessageHookSchema>) => {
      SendMessageHookSchema.parse(data);
      return sendMessage(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (error: any) => {
      logger.error('[useSendMessage_Error]', { error: error.message });
    }
  });
}

export function useSendAudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: z.infer<typeof SendAudioHookSchema>) => {
      SendAudioHookSchema.parse(data);
      return sendAudio(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (error: any) => {
      logger.error('[useSendAudio_Error]', { error: error.message });
    }
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      DeleteMessageHookSchema.parse(id);
      return deleteMessage(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      logger.error('[useDeleteMessage_Error]', { error: error.message });
    }
  });
}
