import { fetchApi } from '../utils';

export async function getPlans() {
  return fetchApi('/api/admin/plans');
}

export async function createPlan(data: any) {
  return fetchApi('/api/admin/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePlan(id: string | number, data: any) {
  return fetchApi(`/api/admin/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deletePlan(id: string | number) {
  return fetchApi(`/api/admin/plans/${id}`, {
    method: 'DELETE',
  });
}
