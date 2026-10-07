import { environment } from '../config/environment';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse } from '../types/api';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isLogin = path.includes('/Login');
  const token = useAuthStore.getState().token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token && !isLogin ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${environment.apiUrl}${path}`, { ...options, headers });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError(401, 'Sessão expirada');
  }

  const body: ApiResponse<T> = await response.json();

  if (!response.ok || !body.isSuccess) {
    throw new ApiError(response.status, body.message ?? 'Erro inesperado na API');
  }

  return body.data;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
};
