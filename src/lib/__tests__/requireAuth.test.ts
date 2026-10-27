import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirect(u) }));

let pathname: string | null = null;
let cookieValue: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieValue ? { value: cookieValue } : undefined) }),
  headers: async () => ({ get: (k: string) => (k === 'x-pathname' ? pathname : null) }),
}));
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T,>(fn: T) => fn }));
vi.mock('../apiClient', () => ({
  ApiError: class extends Error {
    status = 401;
  },
  authApi: { getCurrentUser: vi.fn() },
}));

import { requireAuth } from '../auth';

beforeEach(() => {
  redirect.mockClear();
  cookieValue = undefined;
  pathname = null;
});

describe('requireAuth', () => {
  it('sends a signed-out Dinero visit to the Dinero login with the page to return to', async () => {
    pathname = '/loans';
    await expect(requireAuth()).rejects.toThrow('REDIRECT:/login?from=%2Floans');
  });

  it('keeps the plain login for Legacy pages and when the path is unknown', async () => {
    pathname = '/dashboard';
    await expect(requireAuth()).rejects.toThrow('REDIRECT:/login');
    pathname = null;
    await expect(requireAuth()).rejects.toThrow('REDIRECT:/login');
  });
});
