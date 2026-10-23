import { afterEach, describe, expect, it, vi } from 'vitest';

import { APP_LOCKED_EVENT } from '../appLock';
import { watchSession } from '../authExpiry';
import { makeQueryClient } from '../query/client';

vi.mock('next/navigation', () => ({
  unstable_rethrow: (e: unknown) => {
    if ((e as { digest?: string }).digest === 'NEXT_REDIRECT') throw e;
  },
}));

const lockedResult = { success: false, error: { code: 'APP_LOCKED', message: 'locked' } };

function listen() {
  const seen = vi.fn();
  window.addEventListener(APP_LOCKED_EVENT, seen);
  return { seen, stop: () => window.removeEventListener(APP_LOCKED_EVENT, seen) };
}

afterEach(() => vi.restoreAllMocks());

describe('app-locked event wiring', () => {
  it('watchSession raises it for a locked action result and passes the value through', async () => {
    const l = listen();
    await expect(watchSession(Promise.resolve(lockedResult))).resolves.toBe(lockedResult);
    expect(l.seen).toHaveBeenCalledTimes(1);
    l.stop();
  });

  it('a query or mutation that returns a locked result raises it', async () => {
    const l = listen();
    const client = makeQueryClient();
    await client.fetchQuery({ queryKey: ['a'], queryFn: async () => lockedResult });
    await client.getMutationCache().build(client, { mutationFn: async () => lockedResult }).execute(undefined);
    expect(l.seen).toHaveBeenCalledTimes(2);
    l.stop();
  });

  it('a query that throws an ApiError 423 raises it', async () => {
    const l = listen();
    const client = makeQueryClient();
    await client.fetchQuery({ queryKey: ['b'], queryFn: async () => { throw Object.assign(new Error('x'), { status: 423 }); }, retry: false }).catch(() => undefined);
    expect(l.seen).toHaveBeenCalledTimes(1);
    l.stop();
  });

  it('an ordinary result raises nothing', async () => {
    const l = listen();
    await watchSession(Promise.resolve({ success: true, data: 1 }));
    expect(l.seen).not.toHaveBeenCalled();
    l.stop();
  });
});

describe('apiResult and redirects', () => {
  it('passes a redirect thrown inside the body on instead of returning a failure', async () => {
    const { apiResult } = await import('../apiResult');
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' });
    await expect(apiResult('x', async () => { throw redirectError; })).rejects.toBe(redirectError);
  });

  it('still turns an ordinary error into a failure result', async () => {
    const { apiResult } = await import('../apiResult');
    await expect(apiResult('fallback', async () => { throw new Error('boom'); })).resolves.toMatchObject({ success: false });
  });
});
