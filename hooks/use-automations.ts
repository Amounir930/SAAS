import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAutomations, 
  getAutomation, 
  createAutomation, 
  updateAutomation, 
  deleteAutomation, 
  toggleAutomation,
  getAutomationSessions
} from '@/lib/api/automations';

export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn: () => getAutomations(),
  });
}

export function useAutomation(id: number) {
  return useQuery({
    queryKey: ['automations', id],
    queryFn: () => getAutomation(id),
    enabled: !!id,
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createAutomation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateAutomation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automations', variables.id] });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAutomation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => toggleAutomation(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automations', variables.id] });
    },
  });
}

export function useAutomationSessions(automationId: number) {
  return useQuery({
    queryKey: ['automations', automationId, 'sessions'],
    queryFn: () => getAutomationSessions(automationId),
    enabled: !!automationId,
  });
}
