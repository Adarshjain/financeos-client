import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';

import type { ApiClient } from './api';
import { makeApi } from './api';
import type { User } from './test';
import { freshUser } from './test';

export async function secondUser(
  request: APIRequestContext,
  label = 'user-b'
): Promise<{ user: User; api: ApiClient }> {
  return freshUser(request, label);
}

export async function expectForeign(
  apiB: ApiClient,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  body?: unknown
): Promise<number> {
  const methodFn = (apiB as any)[method];
  if (!methodFn) {
    throw new Error(`Unsupported method ${method} on ApiClient`);
  }

  const options: Record<string, unknown> = {};
  if (body !== undefined) {
    options.body = body;
  }

  const res = await methodFn.call(apiB, path, options);
  const status = res.response.status;
  expect(
    [400, 403, 404].includes(status),
    `Expected 404/403 (or 400 permission validation error) for cross-tenant request to ${method} ${path}, but got ${status}. Body: ${JSON.stringify(res.error)}`
  ).toBe(true);
  return status;
}

export async function expectUnauthenticated(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  body?: unknown
): Promise<void> {
  const unauthApi = makeApi();
  const methodFn = (unauthApi as any)[method];
  if (!methodFn) {
    throw new Error(`Unsupported method ${method} on ApiClient`);
  }

  const options: Record<string, unknown> = {};
  if (body !== undefined) {
    options.body = body;
  }

  const res = await methodFn.call(unauthApi, path, options);
  expect(
    res.response.status,
    `Expected 401 for unauthenticated request to ${method} ${path}, but got ${res.response.status}`
  ).toBe(401);
}
