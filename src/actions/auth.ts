'use server';

import { redirect } from 'next/navigation';

import { authApi } from '@/lib/apiClient';
import { apiResult, validationError } from '@/lib/apiResult';
import { clearSessionCookie,setSessionCookie } from '@/lib/auth';
import { optionalString } from '@/lib/forms';
import type {
  ApiResult,
  GoogleAuthStartResponse,
  UserResponse,
} from '@/lib/types';

export async function signup(
  _prevState: ApiResult<UserResponse> | null,
  formData: FormData
): Promise<ApiResult<UserResponse>> {
  const email = optionalString(formData, 'email');
  const password = formData.get('password');

  if (!email || typeof password !== 'string' || password === '') {
    return validationError('Email and password are required');
  }

  if (password.length < 8) {
    return validationError('Password must be at least 8 characters');
  }

  return apiResult('An unexpected error occurred', () =>
    authApi.signup({ email, password }),
  );
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

  return apiResult('An unexpected error occurred', async () => {
    const { user, sessionCookie } = await authApi.login({ email, password });
    if (sessionCookie) {
      await setSessionCookie(sessionCookie);
    }
    return user;
  });
}

export async function logout(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Ignore logout errors — the local cookie is cleared regardless.
  }
  await clearSessionCookie();
  // Deliberately outside any try/catch: `redirect` signals by throwing, so
  // wrapping it would swallow the navigation.
  redirect('/login');
}

export async function startGoogleSSO(): Promise<
  ApiResult<GoogleAuthStartResponse>
> {
  return apiResult('Failed to start Google SSO', () =>
    authApi.startGoogleAuth(),
  );
}

export async function handleGoogleCallbackAction(
  code: string | undefined,
  state: string | undefined,
  error: string | undefined
): Promise<ApiResult<UserResponse>> {
  return apiResult('Failed to complete Google SSO', async () => {
    const { user, sessionCookie } = await authApi.handleGoogleCallback({
      code,
      state,
      error,
    });
    if (sessionCookie) {
      await setSessionCookie(sessionCookie);
    }
    return user;
  });
}
