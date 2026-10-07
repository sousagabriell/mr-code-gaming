import { environment } from '../config/environment';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse, FieldError } from '../types/api';

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldError[];

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** O backend devolve `errors` como `[{ field, message }]`, mas versões antigas mandavam `string[]`. */
function normalizeErrors(errors: ApiResponse<unknown>['errors']): FieldError[] {
  if (!errors) return [];
  return errors.map((e) => (typeof e === 'string' ? { field: '', message: e } : e));
}

/** O middleware de exceções do backend responde em PascalCase (IsSuccess/Message); o resto em camelCase. */
function normalizeCasing<T>(raw: Record<string, unknown>): ApiResponse<T> {
  if ('isSuccess' in raw || !('IsSuccess' in raw)) return raw as unknown as ApiResponse<T>;
  return {
    isSuccess: raw.IsSuccess as boolean,
    message: (raw.Message as string | null) ?? null,
    data: raw.Data as T,
    errors: (raw.Errors as ApiResponse<T>['errors']) ?? null,
  };
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

  if (response.status === 401 && !isLogin) {
    useAuthStore.getState().logout();
    throw new ApiError(401, 'Sessão expirada');
  }

  if (response.status === 403) {
    throw new ApiError(403, 'Você não tem permissão para esta ação');
  }

  const text = await response.text();
  const body = text ? normalizeCasing<T>(JSON.parse(text)) : null;

  if (!body) {
    if (response.ok) return undefined as T;
    throw new ApiError(response.status, 'Erro inesperado na API');
  }

  // Erros de validação chegam com HTTP 200 e isSuccess=false.
  if (!response.ok || !body.isSuccess) {
    const fieldErrors = normalizeErrors(body.errors);
    const message = body.message ?? fieldErrors[0]?.message ?? 'Erro inesperado na API';
    throw new ApiError(response.status, message, fieldErrors);
  }

  return body.data;
}

function withBody(method: string, data?: unknown): RequestInit {
  return { method, body: data !== undefined ? JSON.stringify(data) : undefined };
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, withBody('POST', data)),
  put: <T>(path: string, data?: unknown) => request<T>(path, withBody('PUT', data)),
  patch: <T>(path: string, data?: unknown) => request<T>(path, withBody('PATCH', data)),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
