export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super(`API request failed with status ${status}`);
    this.status = status;
    this.payload = payload;
  }
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
  const url = buildUrl(path, options?.query);
  const response = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: {
      'content-type': 'application/json'
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return payload as TResponse;
}
