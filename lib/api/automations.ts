import { fetchApi } from './utils';

export async function getAutomations() {
  return fetchApi('/api/automations');
}

export async function getAutomation(id: number) {
  return fetchApi(`/api/automations/${id}`);
}

export async function createAutomation(data: any) {
  return fetchApi('/api/automations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAutomation(id: number, data: any) {
  return fetchApi(`/api/automations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAutomation(id: number) {
  return fetchApi(`/api/automations/${id}`, {
    method: 'DELETE',
  });
}

export async function toggleAutomation(id: number, isActive: boolean) {
  return fetchApi(`/api/automations/${id}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ isActive }),
  });
}

export async function getAutomationSessions(automationId: number) {
  return fetchApi(`/api/sessions/automation?automationId=${automationId}`);
}
