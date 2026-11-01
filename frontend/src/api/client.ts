import { tokenStorage } from '../auth/tokenStorage';

/** An API call that failed. status 0 means the server couldn't be reached. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

type QueryValue = string | number | boolean | undefined;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  json?: unknown;
  formData?: FormData;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

type Options = Omit<RequestOptions, 'method'>;

let unauthorizedHandler: (() => void) | undefined;

/**
 * Called when a request that carried a token gets a 401: the session has
 * expired or the account is gone. The auth provider signs the user out.
 */
export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

export function apiUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_URL}/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // Not JSON: a proxy error page, for example.
  }
  if (res.status === 413) return 'file too large';
  return res.status >= 500 ? 'internal server error' : `request failed (${res.status})`;
}

async function send(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', json, formData, query, signal } = options;
  const headers = new Headers({ Accept: 'application/json' });
  const token = tokenStorage.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  } else if (formData) {
    // The browser sets the multipart boundary itself.
    body = formData;
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(path, query), { method, headers, body: body ?? null, signal: signal ?? null });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'network error');
  }

  if (!res.ok) {
    const message = await readErrorMessage(res);
    // A 401 without a token is a wrong password, not an expired session.
    if (res.status === 401 && token) unauthorizedHandler?.();
    throw new ApiError(res.status, message);
  }
  return res;
}

export const api = {
  async get<T>(path: string, options?: Options): Promise<T> {
    return (await send(path, options)).json() as Promise<T>;
  },
  async post<T>(path: string, options?: Options): Promise<T> {
    return (await send(path, { ...options, method: 'POST' })).json() as Promise<T>;
  },
  async put<T>(path: string, options?: Options): Promise<T> {
    return (await send(path, { ...options, method: 'PUT' })).json() as Promise<T>;
  },
  async patch<T>(path: string, options?: Options): Promise<T> {
    return (await send(path, { ...options, method: 'PATCH' })).json() as Promise<T>;
  },
  async delete<T>(path: string, options?: Options): Promise<T> {
    return (await send(path, { ...options, method: 'DELETE' })).json() as Promise<T>;
  },
  async blob(path: string, options?: Options): Promise<Blob> {
    return (await send(path, options)).blob();
  },
};
