import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirect(u), unstable_rethrow: (e: unknown) => { if (String((e as Error).message).startsWith('REDIRECT:')) throw e; } }));

let pathname: string | null = '/ds/loans';
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'sess' }) }),
  headers: async () => ({ get: (k: string) => (k === 'x-pathname' ? pathname : null), has: () => false }),
}));
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T,>(fn: T) => fn }));

const me = vi.fn();
vi.mock('../apiClient', () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super('x');
    }
  },
  authApi: { getCurrentUser: () => me() },
}));

import { ApiError } from '../apiClient';
import { getOptionalSession, getSession } from '../auth';

beforeEach(() => {
  redirect.mockClear();
  pathname = '/ds/loans';
});

describe('getSession when locked', () => {
  it('redirects to the lock screen on a 423', async () => {
    me.mockRejectedValue(new (ApiError as unknown as new (status: number) => Error)(423));
    await expect(getSession()).rejects.toThrow('REDIRECT:/ds/locked?from=%2Fds%2Floans');
  });

  it('keeps the 423 as an error on the lock screen itself', async () => {
    pathname = '/ds/locked';
    me.mockRejectedValue(new (ApiError as unknown as new (status: number) => Error)(423));
    await expect(getSession()).rejects.toMatchObject({ status: 423 });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('lets the optional variant pass the redirect on instead of treating it as signed out', async () => {
    me.mockRejectedValue(new (ApiError as unknown as new (status: number) => Error)(423));
    await expect(getOptionalSession()).rejects.toThrow('REDIRECT:/ds/locked');
  });

  it('still treats a 401 as signed out', async () => {
    me.mockRejectedValue(new (ApiError as unknown as new (status: number) => Error)(401));
    await expect(getSession()).resolves.toBeNull();
  });
});
