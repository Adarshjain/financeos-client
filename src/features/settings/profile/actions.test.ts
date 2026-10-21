import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirect(u) }));

const clearSessionCookie = vi.fn();
vi.mock('@/lib/auth', () => ({ clearSessionCookie: () => clearSessionCookie() }));

const run = vi.fn();
vi.mock('@/lib/domainApi', () => ({ createDomainAction: () => run }));
vi.mock('@/lib/apiClient', () => ({ authApi: { deleteAccount: vi.fn() } }));

import { deleteAccount } from './actions';

beforeEach(() => {
  redirect.mockClear();
  clearSessionCookie.mockReset();
  run.mockReset();
});

describe('deleteAccount', () => {
  it('returns the failure and keeps the session', async () => {
    const failure = { success: false, error: { code: 'ACCOUNT_DELETE_BUSY', message: 'busy' } };
    run.mockResolvedValue(failure);
    expect(await deleteAccount({ password: 'x' })).toBe(failure);
    expect(clearSessionCookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('clears the session and redirects to /login?deleted=1 on success', async () => {
    run.mockResolvedValue({ success: true, data: undefined });
    await expect(deleteAccount({ password: 'x' })).rejects.toThrow('NEXT_REDIRECT /login?deleted=1');
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });

  it('redirects to the Dinero login when the Dinero card asks for it', async () => {
    run.mockResolvedValue({ success: true, data: undefined });
    await expect(deleteAccount({ password: 'x' }, true)).rejects.toThrow('NEXT_REDIRECT /ds/login?deleted=1');
  });
});
