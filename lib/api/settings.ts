import { fetchApi } from './utils';

export async function getUserProfile() {
  return fetchApi('/api/user');
}

export async function updateUserProfile(data: any) {
  return fetchApi('/api/user', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: any) {
  return fetchApi('/api/user/password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAccount() {
  return fetchApi('/api/user/delete', {
    method: 'DELETE',
  });
}

export async function getBranding() {
  return fetchApi('/api/branding');
}

export async function updateBranding(data: any) {
  return fetchApi('/api/branding', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTeam() {
  return fetchApi('/api/team');
}

export async function updateTeam(data: any) {
  return fetchApi('/api/team', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
