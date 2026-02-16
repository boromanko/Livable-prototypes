import { clearDemoAccessPassword, getDemoAccessPassword } from '../lib/demoAccess';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super(`API request failed with status ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

function withBaseUrl(path: string): string {
  if (!apiBaseUrl || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        params.append(key, String(item));
      }
      continue;
    }

    params.append(key, String(rawValue));
  }

  const queryString = params.toString();
  if (!queryString) {
    return path;
  }

  return `${path}?${queryString}`;
}

export async function apiRequest<TResponse>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    query?: Record<string, unknown>;
    body?: unknown;
  }
): Promise<TResponse> {
  const url = withBaseUrl(buildUrl(path, options?.query));
  const demoAccessPassword = getDemoAccessPassword();
  const hasBody = options?.body !== undefined;
  const headers: Record<string, string> = {};

  if (hasBody) {
    headers['content-type'] = 'application/json';
  }

  if (demoAccessPassword) {
    headers['x-demo-password'] = demoAccessPassword;
  }

  const response = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearDemoAccessPassword();
    }
    throw new ApiError(response.status, payload);
  }

  return payload as TResponse;
}

export async function validateDemoAccessPassword(password: string): Promise<void> {
  const response = await fetch(withBaseUrl('/api/auth/validate'), {
    method: 'GET',
    headers: {
      'x-demo-password': password
    }
  });

  if (!response.ok) {
    throw new ApiError(response.status, null);
  }
}
