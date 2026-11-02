import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  claimAuthExpired,
  currentSessionGeneration,
  isSessionExpiredResult,
  markSessionRenewed,
  notifyIfSessionExpired,
  raiseAuthExpired,
  SESSION_RENEWED_GRACE_MS,
  watchSession,
} from '../authExpiry';

const expired = { success: false, error: { code: 'UNAUTHORIZED', message: 'x', timestamp: 't' } };

function listen() {
  const handler = vi.fn();
  window.addEventListener('financeos:auth-expired', handler);
  return { handler, off: () => window.removeEventListener('financeos:auth-expired', handler) };
}

afterEach(() => vi.restoreAllMocks());

describe('isSessionExpiredResult', () => {
  it('recognises a failed server-action result with the 401 code, and a thrown 401', () => {
    expect(isSessionExpiredResult(expired)).toBe(true);
    expect(isSessionExpiredResult({ status: 401 })).toBe(true);
  });

  it('ignores everything else', () => {
    expect(isSessionExpiredResult({ success: true, data: 1 })).toBe(false);
    expect(isSessionExpiredResult({ success: false, error: { code: 'NOT_FOUND' } })).toBe(false);
    expect(isSessionExpiredResult(null)).toBe(false);
    expect(isSessionExpiredResult('UNAUTHORIZED')).toBe(false);
  });
});

describe('watchSession (server actions called outside react-query)', () => {
  it('returns the result untouched and raises auth-expired for a 401 once claimed', async () => {
    const release = claimAuthExpired();
    const { handler, off } = listen();
    await expect(watchSession(Promise.resolve(expired))).resolves.toBe(expired);
    expect(handler).toHaveBeenCalledTimes(1);
    off();
    release();
  });

  it('is silent for ordinary results, and where nothing claimed the event', async () => {
    const { handler, off } = listen();
    await expect(watchSession(Promise.resolve(expired))).resolves.toBe(expired);
    const release = claimAuthExpired();
    await expect(watchSession(Promise.resolve({ success: true, data: 1 }))).resolves.toEqual({ success: true, data: 1 });
    expect(handler).not.toHaveBeenCalled();
    off();
    release();
  });

  it('lets a rejection through unchanged', async () => {
    await expect(watchSession(Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    notifyIfSessionExpired(undefined);
  });
});

describe('a sign-in starts a new session: late 401s of older requests are ignored', () => {
  it('raises for a request of the current generation and drops one stamped before the sign-in', () => {
    const { handler, off } = listen();
    const before = currentSessionGeneration();
    raiseAuthExpired(before);
    expect(handler).toHaveBeenCalledTimes(1);

    markSessionRenewed();
    expect(currentSessionGeneration()).toBe(before + 1);
    raiseAuthExpired(before);
    expect(handler).toHaveBeenCalledTimes(1);
    // A request that started after the sign-in is a real expiry again.
    raiseAuthExpired(currentSessionGeneration());
    expect(handler).toHaveBeenCalledTimes(2);
    off();
  });

  it('an unstamped 401 is ignored for a grace window after the sign-in, then raised again', () => {
    const { handler, off } = listen();
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    markSessionRenewed();
    now.mockReturnValue(1_000_000 + SESSION_RENEWED_GRACE_MS - 1);
    raiseAuthExpired();
    expect(handler).not.toHaveBeenCalled();
    now.mockReturnValue(1_000_000 + SESSION_RENEWED_GRACE_MS + 1);
    raiseAuthExpired();
    expect(handler).toHaveBeenCalledTimes(1);
    off();
  });

  it('watchSession drops the 401 of a call that was in flight while the visitor signed in', async () => {
    const release = claimAuthExpired();
    const { handler, off } = listen();
    let answer!: (v: unknown) => void;
    const pending = watchSession(new Promise((resolve) => (answer = resolve)));
    markSessionRenewed();
    answer(expired);
    await pending;
    expect(handler).not.toHaveBeenCalled();
    off();
    release();
  });
});
