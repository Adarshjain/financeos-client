import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

const redirectToSignIn = vi.fn(async () => {
  throw new Error('REDIRECT');
});
vi.mock('@/lib/auth', () => ({ redirectToSignIn: () => redirectToSignIn() }));

import { loaded, orNull } from '../loadHelpers';

const unauthorized = () => new ApiError(401, { code: 'UNAUTHORIZED', message: 'x', timestamp: '' });

beforeEach(() => {
  redirectToSignIn.mockClear();
});

describe('loadHelpers on an ended session', () => {
  it('loaded sends the visitor to sign in instead of reporting a page failure', async () => {
    await expect(loaded(Promise.reject(unauthorized()))).rejects.toThrow('REDIRECT');
    expect(redirectToSignIn).toHaveBeenCalledTimes(1);
  });

  it('orNull does the same', async () => {
    await expect(orNull(Promise.reject(unauthorized()))).rejects.toThrow('REDIRECT');
  });

  it('other failures still degrade as before', async () => {
    const boom = new ApiError(500, { code: 'X', message: 'boom', timestamp: '' }, { requestId: 'r' });
    await expect(loaded(Promise.reject(boom))).resolves.toEqual({ ok: false, reference: 'r' });
    await expect(orNull(Promise.reject(boom))).resolves.toBeNull();
    expect(redirectToSignIn).not.toHaveBeenCalled();
  });
});
