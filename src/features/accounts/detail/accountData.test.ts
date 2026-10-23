import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

const get = vi.fn();
vi.mock('@/lib/apiClient', () => ({ accountsApi: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T,>(fn: T) => fn }));
const redirectToSignIn = vi.fn(async () => {
  throw new Error('REDIRECT');
});
vi.mock('@/lib/auth', () => ({ redirectToSignIn: () => redirectToSignIn() }));

import { loadAccount } from './accountData';

beforeEach(() => {
  get.mockReset();
  redirectToSignIn.mockClear();
});

describe('loadAccount', () => {
  it('is the account, or null when the request failed', async () => {
    get.mockResolvedValueOnce({ id: 'a' });
    await expect(loadAccount('a')).resolves.toEqual({ id: 'a' });
    get.mockRejectedValueOnce(new ApiError(500, { code: 'X', message: 'x', timestamp: '' }));
    await expect(loadAccount('a')).resolves.toBeNull();
  });

  it('sends the visitor to sign in when the session ended, instead of reading as a missing account', async () => {
    get.mockRejectedValueOnce(new ApiError(401, { code: 'UNAUTHORIZED', message: 'x', timestamp: '' }));
    await expect(loadAccount('a')).rejects.toThrow('REDIRECT');
  });
});
