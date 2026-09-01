import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { ApiError,authApi } from './apiClient';
import type { UserResponse } from './types';

/**
 * Resolve the current user, or `null` when there is genuinely no session.
 *
 * Wrapped in React's `cache()` so repeated calls within a single render pass
 * share one request. Every protected page goes through `requireAuth` in the
 * layout, and some (e.g. /settings) call it again for the user object; since
 * `apiClient` sets `cache: 'no-store'`, those were separate round trips to
 * `/api/v1/auth/me` on the critical path of every navigation.
 *
 * Throws on anything other than a 401. This used to swallow every error and
 * return `null`, which made "the backend is unreachable" indistinguishable from
 * "you are signed out" — the user was bounced to /login with no explanation.
 * There are route error boundaries now, so an unexpected failure surfaces as a
 * retryable error instead of a misleading redirect. Use `getOptionalSession`
 * where "unknown" should be treated as "not signed in".
 */
export const getSession = cache(async (): Promise<UserResponse | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('FINANCEOS_SESSION');

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    return await authApi.getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // The cookie exists but the backend rejected it. We cannot clear it here:
      // `cookies().delete()` is only permitted in a Server Action or Route
      // Handler, not during a page render. `proxy.ts` only checks that the
      // cookie is present, so it keeps admitting the request — the page then
      // redirects to /login, which resolves in one hop. `logout` clears it.
      return null;
    }
    throw error;
  }
});

/**
 * Like `getSession`, but never throws — an unreachable backend yields `null`.
 *
 * For the login and signup pages, which only ask "is this user already signed
 * in?" so they can redirect away. Treating unknown as "not signed in" keeps the
 * sign-in form reachable during a backend outage, rather than replacing it with
 * an error page the user can do nothing about.
 */
export async function getOptionalSession(): Promise<UserResponse | null> {
  try {
    return await getSession();
  } catch {
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
    maxAge: 60 * 60 * 24 * 365, // 1 year — keep in sync with spring.session.timeout and cookie max-age in server application.yml
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('FINANCEOS_SESSION');
}
