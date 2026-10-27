import { afterEach, describe, expect, it, vi } from 'vitest';

import { APP_LOCKED_EVENT, isAppLockedResult, isLockRoute, LOCK_ROUTE, lockHref, notifyIfAppLocked } from '../appLock';

describe('isAppLockedResult', () => {
  it('recognises a failed action result, a thrown ApiError and a bare 423', () => {
    expect(isAppLockedResult({ success: false, error: { code: 'APP_LOCKED' } })).toBe(true);
    expect(isAppLockedResult({ status: 423, response: { code: 'APP_LOCKED' } })).toBe(true);
    expect(isAppLockedResult({ status: 423 })).toBe(true);
  });

  it('ignores everything else, including a failed unlock and an expired session', () => {
    expect(isAppLockedResult({ success: false, error: { code: 'APP_LOCK_UNLOCK_FAILED' } })).toBe(false);
    expect(isAppLockedResult({ success: false, error: { code: 'UNAUTHORIZED' } })).toBe(false);
    expect(isAppLockedResult({ status: 401 })).toBe(false);
    expect(isAppLockedResult({ success: true, data: 1 })).toBe(false);
    expect(isAppLockedResult(null)).toBe(false);
    expect(isAppLockedResult('x')).toBe(false);
  });
});

describe('notifyIfAppLocked', () => {
  afterEach(() => vi.restoreAllMocks());

  it('raises the event only for a locked result', () => {
    const seen = vi.fn();
    window.addEventListener(APP_LOCKED_EVENT, seen);
    notifyIfAppLocked({ success: true, data: 1 });
    expect(seen).not.toHaveBeenCalled();
    notifyIfAppLocked({ success: false, error: { code: 'APP_LOCKED' } });
    expect(seen).toHaveBeenCalledTimes(1);
    window.removeEventListener(APP_LOCKED_EVENT, seen);
  });
});

describe('lockHref', () => {
  it('carries a same-origin path as from', () => {
    expect(lockHref('/loans?x=1')).toBe(`${LOCK_ROUTE}?from=${encodeURIComponent('/loans?x=1')}`);
    expect(lockHref('/dashboard')).toBe(`${LOCK_ROUTE}?from=%2Fdashboard`);
  });

  it('drops open-redirect shapes and the lock route itself', () => {
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', '/a\tb', '', null, undefined]) {
      expect(lockHref(bad)).toBe(LOCK_ROUTE);
    }
    expect(lockHref(LOCK_ROUTE)).toBe(LOCK_ROUTE);
    expect(lockHref(`${LOCK_ROUTE}?from=/x`)).toBe(LOCK_ROUTE);
  });

  it('knows the lock route', () => {
    expect(isLockRoute('/locked')).toBe(true);
    expect(isLockRoute('/lockedness')).toBe(false);
    expect(isLockRoute(null)).toBe(false);
  });
});
