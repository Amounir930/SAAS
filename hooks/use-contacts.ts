import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { getContacts, getContactByChat, updateContact, deleteContact, assignAgent } from '@/lib/api/contacts';
import { logger } from '@/lib/logger';

// === Hook Validation Schemas ===

const ContactUpdateSchema = z.object({
  id: z.number().int().positive(),
  data: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    department: z.string().optional(),
    funnelStage: z.string().optional(),
  }),
});

const AssignAgentSchema = z.object({
  contactId: z.number().int().positive(),
  userId: z.number().int().positive().nullable(),
});

const DeleteContactSchema = z.number().int().positive();

export function useContacts(params?: Parameters<typeof getContacts>[0]) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => getContacts(params),
  });
}

export function useContactByChat(chatId: number) {
  return useQuery({
    queryKey: ['contacts', 'by-chat', chatId],
    queryFn: () => getContactByChat(chatId),
    enabled: !!chatId,
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: z.infer<typeof ContactUpdateSchema>) => {
      ContactUpdateSchema.parse(variables);
      return updateContact(variables.id, variables.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', 'by-chat'] });
    },
    onError: (error: any) => {
      logger.error('[useUpdateContact_Error]', { error: error.message });
    }
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {
      DeleteContactSchema.parse(id);
      return deleteContact(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: any) => {
      logger.error('[useDeleteContact_Error]', { error: error.message });
    }
  });
}

export function useAssignAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: z.infer<typeof AssignAgentSchema>) => {
      AssignAgentSchema.parse(variables);
      return assignAgent(variables.contactId, variables.userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: any) => {
      logger.error('[useAssignAgent_Error]', { error: error.message });
    }
  });
}
