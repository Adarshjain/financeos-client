import '@/test/next-mocks';

import { cookies } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGoogleCallbackAction, startGoogleSSO } from '@/actions/auth';
import { authApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  authApi: {
    startGoogleAuth: vi.fn(),
    handleGoogleCallback: vi.fn(),
  },
}));

const STATE_COOKIE = 'FINANCEOS_SSO_STATE';

/** A real cookie jar, so set → get → delete behave like the browser's cookies for one visitor. */
function useCookieJar() {
  const jar = new Map<string, { value: string; options?: Record<string, unknown> }>();
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      jar.set(name, { value, options });
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  } as never);
  return jar;
}

async function startSignIn(state: string) {
  vi.mocked(authApi.startGoogleAuth).mockResolvedValue({
    authorizationUrl: `https://accounts.example/o/oauth2/v2/auth?client_id=x&state=${encodeURIComponent(state)}`,
  } as never);
  return startGoogleSSO();
}

describe('Google sign-in is bound to the browser that started it', () => {
  let jar: ReturnType<typeof useCookieJar>;

  beforeEach(() => {
    vi.clearAllMocks();
    jar = useCookieJar();
    vi.mocked(authApi.handleGoogleCallback).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.test' },
      sessionCookie: 'sess-1',
    } as never);
  });

  it('start remembers the state in a short-lived http-only cookie', async () => {
    const res = await startSignIn('abcd1234.1760000000.nonce.sig');

    expect(res.success).toBe(true);
    expect(jar.get(STATE_COOKIE)?.value).toBe('abcd1234.1760000000.nonce.sig');
    expect(jar.get(STATE_COOKIE)?.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  });

  it('the callback with the remembered state signs in and forgets the state', async () => {
    await startSignIn('my-state');

    const res = await handleGoogleCallbackAction('code', 'my-state', undefined);

    expect(res.success).toBe(true);
    expect(authApi.handleGoogleCallback).toHaveBeenCalledWith({ code: 'code', state: 'my-state', error: undefined });
    expect(jar.get('FINANCEOS_SESSION')?.value).toBe('sess-1');
    expect(jar.has(STATE_COOKIE)).toBe(false);
  });

  it('a callback carrying another sign-in state is refused without calling the API', async () => {
    await startSignIn('my-state');

    const res = await handleGoogleCallbackAction('attacker-code', 'attacker-state', undefined);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('VALIDATION_ERROR');
      expect(res.error.message).toBe('Google sign-in expired or was not started here. Please try again.');
    }
    expect(authApi.handleGoogleCallback).not.toHaveBeenCalled();
    expect(jar.has('FINANCEOS_SESSION')).toBe(false);
    expect(jar.has(STATE_COOKIE)).toBe(false);
  });

  it('a callback in a browser that never started sign-in is refused', async () => {
    const res = await handleGoogleCallbackAction('attacker-code', 'attacker-state', undefined);

    expect(res.success).toBe(false);
    expect(authApi.handleGoogleCallback).not.toHaveBeenCalled();
  });

  it('a callback without a state is refused', async () => {
    await startSignIn('my-state');

    const res = await handleGoogleCallbackAction('code', undefined, undefined);

    expect(res.success).toBe(false);
    expect(authApi.handleGoogleCallback).not.toHaveBeenCalled();
  });

  it('the remembered state works once', async () => {
    await startSignIn('my-state');
    await handleGoogleCallbackAction('code', 'my-state', undefined);

    const replay = await handleGoogleCallbackAction('code', 'my-state', undefined);

    expect(replay.success).toBe(false);
    expect(authApi.handleGoogleCallback).toHaveBeenCalledTimes(1);
  });
});
