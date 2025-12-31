'use server';

import { redirect } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api-client';
import { setSessionCookie, clearSessionCookie } from '@/lib/auth';
import type { ApiResult, UserResponse } from '@/lib/types';

export async function signup(
  _prevState: ApiResult<UserResponse> | null,
  formData: FormData
): Promise<ApiResult<UserResponse>> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const user = await authApi.signup({ email, password });
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function login(
  _prevState: ApiResult<UserResponse> | null,
  formData: FormData
): Promise<ApiResult<UserResponse>> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const { user, sessionCookie } = await authApi.login({ email, password });
    
    if (sessionCookie) {
      await setSessionCookie(sessionCookie);
    }

    return { success: true, data: user };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.response };
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function logout(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Ignore logout errors
  }
  await clearSessionCookie();
  redirect('/login');
}


