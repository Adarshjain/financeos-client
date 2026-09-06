'use server';

import { redirect } from 'next/navigation';

import { authApi } from '@/lib/apiClient';
import { validationError } from '@/lib/apiResult';
import { clearSessionCookie, setSessionCookie } from '@/lib/auth';
import { createDomainAction } from '@/lib/domainApi';
import { optionalString } from '@/lib/forms';
import type {
  ApiResult,
  UserResponse,
} from '@/lib/types';

export async function signup(
  _prevState: ApiResult<UserResponse> | null,
  formData: FormData
): Promise<ApiResult<UserResponse>> {
  const email = optionalString(formData, 'email');
  const password = formData.get('password');
  const inviteCode = optionalString(formData, 'inviteCode');

  if (!inviteCode) {
    return validationError('Invite code is required');
  }

  if (!email || typeof password !== 'string' || password === '') {
    return validationError('Email and password are required');
  }

  if (password.length < 8) {
    return validationError('Password must be at least 8 characters');
  }

  const action = createDomainAction(
    { fallbackError: 'An unexpected error occurred' },
    async () => {
      const user = await authApi.signup({ email, password, inviteCode });
      try {
        const loginRes = await authApi.login({ email, password });
        if (loginRes?.sessionCookie) {
          await setSessionCookie(loginRes.sessionCookie);
        }
      } catch {
        // Ignore auto-login errors if login fails or is not stubbed in unit tests
      }
      return user;
    }
  );
  return action();
}

export async function login(
  _prevState: ApiResult<UserResponse> | null,
  formData: FormData
): Promise<ApiResult<UserResponse>> {
  const email = optionalString(formData, 'email');
  const password = formData.get('password');

  if (!email || typeof password !== 'string' || password === '') {
    return validationError('Email and password are required');
  }

  const action = createDomainAction(
    { fallbackError: 'An unexpected error occurred' },
    async () => {
      const { user, sessionCookie } = await authApi.login({ email, password });
      if (sessionCookie) {
        await setSessionCookie(sessionCookie);
      }
      return user;
    }
  );
  return action();
}

export async function logout(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Ignore logout errors — the local cookie is cleared regardless.
  }
  await clearSessionCookie();
  redirect('/login');
}

export const startGoogleSSO = createDomainAction(
  { fallbackError: 'Failed to start Google SSO' },
  () => authApi.startGoogleAuth()
);

export const handleGoogleCallbackAction = createDomainAction(
  { fallbackError: 'Failed to complete Google SSO' },
  async (code: string | undefined, state: string | undefined, error: string | undefined) => {
    const { user, sessionCookie } = await authApi.handleGoogleCallback({ code, state, error });
    if (sessionCookie) {
      await setSessionCookie(sessionCookie);
    }
    return user;
  }
);
