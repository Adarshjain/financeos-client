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
  request: APIRequestContext,
  label: string,
  options?: { password?: string; inviteCode?: string }
): Promise<CreatedUser> {
  userCounter += 1;
  const rand = Math.random().toString(36).slice(2, 7);
  const email = `e2e-${runId}-${label}-${userCounter}-${rand}@example.test`;
  const password = options?.password ?? DEFAULT_PASSWORD;
  const inviteCode = options?.inviteCode ?? INVITE_CODE;

  // 1. Signup
  const signupRes = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
    data: {
      email,
      password,
      inviteCode,
    },
  });
  expect(signupRes.status(), `Signup failed: ${await signupRes.text()}`).toBe(201);

  // 2. Login
  const loginRes = await request.post(`${E2E_API_URL}/api/v1/auth/login`, {
    data: {
      email,
      password,
    },
  });
  expect(loginRes.status(), `Login failed: ${await loginRes.text()}`).toBe(200);

  const cookie = parseSessionCookie(loginRes.headersArray());
  if (!cookie) {
    throw new Error('FINANCEOS_SESSION cookie not found in login response headers');
  }

  return { email, password, cookie };
}
