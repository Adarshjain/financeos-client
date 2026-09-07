import { E2E_WIREMOCK_URL } from './config';

const ADMIN = `${E2E_WIREMOCK_URL}/__admin`;

export interface WireMockRequestPattern {
  method?: string;
  urlPath?: string;
  urlPathPattern?: string;
  headers?: Record<string, Record<string, string>>;
  queryParameters?: Record<string, Record<string, string>>;
  bodyPatterns?: Record<string, string>[];
}

export interface LoggedWireMockRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

async function admin(method: string, path: string, body?: unknown): Promise<Response> {
  const res = await fetch(`${ADMIN}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`WireMock admin ${method} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

export async function addMapping(mapping: Record<string, unknown>): Promise<string> {
  const res = await admin('POST', '/mappings', mapping);
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function removeMappings(ids: string[]): Promise<void> {
  for (const id of ids) {
    const res = await fetch(`${ADMIN}/mappings/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      throw new Error(`WireMock DELETE mapping ${id} failed: ${res.status}`);
    }
  }
}

export async function lokiRequestCount(pattern?: WireMockRequestPattern): Promise<number> {
  const defaultPattern: WireMockRequestPattern = {
    method: 'GET',
    urlPath: '/loki/api/v1/query_range',
    ...pattern,
  };
  const res = await admin('POST', '/requests/count', defaultPattern);
  const json = (await res.json()) as { count: number };
  return json.count;
}

export async function findLokiRequests(pattern?: WireMockRequestPattern): Promise<LoggedWireMockRequest[]> {
  const defaultPattern: WireMockRequestPattern = {
    method: 'GET',
    urlPath: '/loki/api/v1/query_range',
    ...pattern,
  };
  const res = await admin('POST', '/requests/find', defaultPattern);
  const json = (await res.json()) as { requests: LoggedWireMockRequest[] };
  return json.requests;
}
