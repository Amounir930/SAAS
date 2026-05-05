import { fetchApi } from './utils';

export async function getMessages(chatId: number, params?: {
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  query.append('chatId', chatId.toString());
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  return fetchApi(`/api/messages?${query.toString()}`);
}

export async function sendMessage(data: {
  chatId: number;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
}) {
  return fetchApi('/api/messages/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendAudio(data: {
  chatId: number;
  audioUrl: string;
}) {
  return fetchApi('/api/messages/sendAudio', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteMessage(id: string) {
  return fetchApi(`/api/messages/${id}`, {
    method: 'DELETE',
  });
}
