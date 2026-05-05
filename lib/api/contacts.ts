import { fetchApi } from './utils';

export async function getContacts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  tagId?: number;
  funnelStageId?: number;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.search) query.append('search', params.search);
  if (params?.tagId) query.append('tagId', params.tagId.toString());
  if (params?.funnelStageId) query.append('funnelStageId', params.funnelStageId.toString());

  return fetchApi(`/api/contacts?${query.toString()}`);
}

export async function getContactByChat(chatId: number) {
  return fetchApi(`/api/contacts/by-chat?chatId=${chatId}`);
}

export async function updateContact(id: number, data: any) {
  return fetchApi(`/api/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteContact(id: number) {
  return fetchApi(`/api/contacts/${id}`, {
    method: 'DELETE',
  });
}

export async function assignAgent(contactId: number, userId: number | null) {
  return fetchApi(`/api/contacts/${contactId}/assign-agent`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function importContacts(data: any) {
  return fetchApi('/api/contacts/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
