import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ApiError,authApi } from './apiClient';
import type { UserResponse } from './types';

export async function getSession(): Promise<UserResponse | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('FINANCEOS_SESSION');

  // No cookie means no session
  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const user = await authApi.getCurrentUser();
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Cookie is invalid - return null and let middleware handle redirect
      // Note: Can't delete cookie here as we're not in a Server Action
      return null;
    }
    // For other errors (network, etc), return null to be safe
    return null;
  }
}

export async function requireAuth(): Promise<UserResponse> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export async function setSessionCookie(value: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('FINANCEOS_SESSION', value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('FINANCEOS_SESSION');
}
