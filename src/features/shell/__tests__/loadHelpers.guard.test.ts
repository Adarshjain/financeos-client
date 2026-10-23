import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

const redirectToSignIn = vi.fn(async () => {
  throw new Error('REDIRECT');
});
vi.mock('@/lib/auth', () => ({ redirectToSignIn: () => redirectToSignIn() }));

import { guardSession, signInIfPrefetchFailed } from '../loadHelpers';

const unauthorized = () => new ApiError(401, { code: 'UNAUTHORIZED', message: 'x', timestamp: '' });

beforeEach(() => {
  redirectToSignIn.mockClear();
});

describe('guardSession', () => {
  it('passes a value through', async () => {
    await expect(guardSession(Promise.resolve(3))).resolves.toBe(3);
  });

  it('sends the visitor to sign in on a 401', async () => {
    await expect(guardSession(Promise.reject(unauthorized()))).rejects.toThrow('REDIRECT');
  });

  it('rethrows any other failure unchanged', async () => {
    const boom = new ApiError(500, { code: 'X', message: 'boom', timestamp: '' });
    await expect(guardSession(Promise.reject(boom))).rejects.toBe(boom);
    expect(redirectToSignIn).not.toHaveBeenCalled();
  });
});

describe('signInIfPrefetchFailed', () => {
  const key = ['inbox'];

  it('sends the visitor to sign in when the prefetch failed with a 401', async () => {
    const qc = new QueryClient();
    await qc.prefetchQuery({ queryKey: key, queryFn: () => Promise.reject(unauthorized()), retry: false });
    await expect(signInIfPrefetchFailed(qc, key)).rejects.toThrow('REDIRECT');
  });

  it('leaves a successful prefetch and other failures alone', async () => {
    const ok = new QueryClient();
    await ok.prefetchQuery({ queryKey: key, queryFn: async () => 1 });
    await expect(signInIfPrefetchFailed(ok, key)).resolves.toBeUndefined();
    const bad = new QueryClient();
    await bad.prefetchQuery({ queryKey: key, queryFn: () => Promise.reject(new Error('x')), retry: false });
    await expect(signInIfPrefetchFailed(bad, key)).resolves.toBeUndefined();
    expect(redirectToSignIn).not.toHaveBeenCalled();
  });
});
