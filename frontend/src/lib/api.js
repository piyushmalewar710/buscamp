import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new Error((data && data.error) || data || response.statusText || 'An error occurred');
  }

  return data;
}

export const apiGet = (path) => apiFetch(path, { method: 'GET' });
export const apiPost = (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPut = (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = (path) => apiFetch(path, { method: 'DELETE' });
