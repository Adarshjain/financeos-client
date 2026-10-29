import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionError, unwrapAction } from '@/lib/actionResult';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { AUTH_EXPIRED_EVENT, claimAuthExpired } from '@/lib/authExpiry';
import type { ErrorResponse } from '@/lib/types';

const failure = (code: string, message: string, status?: number) => ({
  success: false as const,
  error: { code, message } as ErrorResponse,
  status,
});

describe('unwrapAction', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the data of a successful action', async () => {
    await expect(unwrapAction(Promise.resolve({ success: true as const, data: { id: 'a1' } }))).resolves.toEqual({ id: 'a1' });
  });

  it("throws an ActionError carrying the server's response, whose message getErrorMessage shows", async () => {
    const error = await unwrapAction(Promise.resolve(failure('CONFLICT', 'That name is taken.'))).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ActionError);
    expect((error as ActionError).response.code).toBe('CONFLICT');
    expect((error as ActionError).code).toBe('CONFLICT');
    expect(getErrorMessage(error, 'Fallback')).toBe('That name is taken.');
  });

  it("is an ApiError with the backend's status, so status checks written for the browser client still hold", async () => {
    const error = await unwrapAction(Promise.resolve(failure('NOT_FOUND', 'Account not found', 404))).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    const offline = await unwrapAction(Promise.resolve(failure('UNKNOWN_ERROR', 'Try again.'))).catch((e: unknown) => e);
    expect((offline as ApiError).status).toBe(0);
  });

  it("shows the caller's own message for a failure the backend never answered", async () => {
    const error = await unwrapAction(Promise.resolve(failure('UNKNOWN_ERROR', "Couldn't save. Try again."))).catch((e: unknown) => e);
    expect(getErrorMessage(error, 'Could not check this statement')).toBe('Could not check this statement');
  });

  it('raises the auth-expired event for a 401 answer, claimed or not, as the browser client does', async () => {
    const heard = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, heard);
    await unwrapAction(Promise.resolve(failure('UNAUTHORIZED', 'Sign in again.', 401))).catch(() => undefined);
    const release = claimAuthExpired();
    await unwrapAction(Promise.resolve(failure('UNAUTHORIZED', 'Sign in again.', 401))).catch(() => undefined);
    release();
    await unwrapAction(Promise.resolve(failure('CONFLICT', 'Taken.', 409))).catch(() => undefined);
    window.removeEventListener(AUTH_EXPIRED_EVENT, heard);
    expect(heard).toHaveBeenCalledTimes(2);
  });
});
