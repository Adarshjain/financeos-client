import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';

import { DEFAULT_PASSWORD, E2E_API_URL, INVITE_CODE } from './config';

let userCounter = 0;
const runId = process.env.E2E_RUN_ID ?? Date.now().toString(36);

export interface CreatedUser {
  email: string;
  password: string;
  cookie: string;
}

export function parseSessionCookie(headers: { name: string; value: string }[]): string | undefined {
  for (const header of headers) {
    if (header.name.toLowerCase() === 'set-cookie') {
      const match = header.value.match(/FINANCEOS_SESSION=([^;]+)/);
      if (match) {
        return match[1];
      }
    }
  }
  return undefined;
}

export async function createUser(
  _request: APIRequestContext,
  label: string,
  options?: { password?: string; inviteCode?: string }
): Promise<CreatedUser> {
  userCounter += 1;
  const rand = Math.random().toString(36).slice(2, 7);
  const email = `e2e-${runId}-${label}-${userCounter}-${rand}@example.test`;
  const password = options?.password ?? DEFAULT_PASSWORD;
  const inviteCode = options?.inviteCode ?? INVITE_CODE;

  // 1. Signup
  const signupRes = await fetch(`${E2E_API_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      inviteCode,
    }),
  });
  expect(signupRes.status, `Signup failed: ${await signupRes.text()}`).toBe(201);

  // 2. Login
  const loginRes = await fetch(`${E2E_API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  expect(loginRes.status, `Login failed: ${await loginRes.text()}`).toBe(200);

  const rawCookie = loginRes.headers.get('set-cookie') || '';
  const match = rawCookie.match(/FINANCEOS_SESSION=([^;]+)/);
  const cookie = match ? match[1] : undefined;
  if (!cookie) {
    throw new Error('FINANCEOS_SESSION cookie not found in login response headers');
  }

  return { email, password, cookie };
}
