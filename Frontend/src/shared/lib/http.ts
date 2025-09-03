export interface HttpOptions extends RequestInit {
  baseUrl?: string;
}

const defaultBaseUrl = (import.meta as any).env?.VITE_API_URL || '/api';

export async function httpGet<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const baseUrl = options.baseUrl || defaultBaseUrl;
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    method: 'GET'
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText} ${text}`.trim());
  }
  return response.json() as Promise<T>;
}

export async function httpDelete<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const baseUrl = options.baseUrl || defaultBaseUrl;
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    method: 'DELETE'
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`DELETE ${url} failed: ${response.status} ${response.statusText} ${text}`.trim());
  }
  return response.json() as Promise<T>;
}

export async function httpPost<T>(path: string, body?: any, options: HttpOptions = {}): Promise<T> {
  const baseUrl = options.baseUrl || defaultBaseUrl;
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`POST ${url} failed: ${response.status} ${response.statusText} ${text}`.trim());
  }
  return response.json() as Promise<T>;
}


