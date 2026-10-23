import { act, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_LOCK_CHANGED_EVENT, APP_LOCKED_EVENT } from '@/lib/appLock';

let pathname = '/ds/accounts';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { AppLockWatcher } from './AppLockWatcher';

const fetchMock = vi.fn();
const beacon = vi.fn();
const replace = vi.fn();
let visibility: 'visible' | 'hidden' = 'visible';
let focused = true;

function status(over: Record<string, unknown> = {}) {
  return { ok: true, status: 200, json: async () => ({ armed: true, locked: false, lockAfterSeconds: 60, heartbeatSeconds: 15, ...over }) };
}


const calls = (url: string) => fetchMock.mock.calls.filter((c) => c[0] === url).length;

beforeEach(() => {
  vi.useFakeTimers();
  pathname = '/ds/accounts';
  visibility = 'visible';
  focused = true;
  fetchMock.mockReset();
  beacon.mockReset();
  replace.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  vi.spyOn(document, 'hasFocus').mockImplementation(() => focused);
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname: '/ds/accounts', search: '?q=1', replace },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mount() {
  const r = render(<AppLockWatcher />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return r;
}

describe('AppLockWatcher', () => {
  it('with app lock off asks for the status once and never heartbeats', async () => {
    fetchMock.mockResolvedValue(status({ armed: false, lockAfterSeconds: null }));
    await mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(calls('/api/v1/app-lock/status')).toBe(1);
    expect(calls('/api/v1/app-lock/heartbeat')).toBe(0);
    expect(replace).not.toHaveBeenCalled();
  });

  it('heartbeats now and every heartbeatSeconds while armed, visible and focused', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/status') ? status() : { status: 204, ok: true }));
    await mount();
    expect(calls('/api/v1/app-lock/heartbeat')).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(calls('/api/v1/app-lock/heartbeat')).toBe(3);
  });

  it('stops heartbeating when the window loses focus or the tab is hidden, and resumes after', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/status') ? status() : { status: 204, ok: true }));
    await mount();
    const before = calls('/api/v1/app-lock/heartbeat');
    focused = false;
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(calls('/api/v1/app-lock/heartbeat')).toBe(before);
    visibility = 'hidden';
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(calls('/api/v1/app-lock/heartbeat')).toBe(before);
    visibility = 'visible';
    focused = true;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(calls('/api/v1/app-lock/status')).toBe(2);
    expect(calls('/api/v1/app-lock/heartbeat')).toBeGreaterThan(before);
  });

  it('sends the lock beacon on leaving only when the setting is Immediately', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/status') ? status({ lockAfterSeconds: 0 }) : { status: 204, ok: true }));
    await mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    visibility = 'hidden';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(beacon).toHaveBeenCalledWith('/api/v1/app-lock/lock');
    beacon.mockClear();
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('never beacons for other settings, nor straight after arriving', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/status') ? status({ lockAfterSeconds: 60 }) : { status: 204, ok: true }));
    const r = await mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(beacon).not.toHaveBeenCalled();
    r.unmount();

    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/status') ? status({ lockAfterSeconds: 0 }) : { status: 204, ok: true }));
    await mount();
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(beacon).not.toHaveBeenCalled();
  });

  it('goes to the lock screen, returning here, when the status says locked', async () => {
    fetchMock.mockResolvedValue(status({ locked: true }));
    await mount();
    expect(replace).toHaveBeenCalledWith(`/ds/locked?from=${encodeURIComponent('/ds/accounts?q=1')}`);
    expect(calls('/api/v1/app-lock/heartbeat')).toBe(0);
  });

  it('goes to the lock screen when a heartbeat is refused with 423', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/status') ? status() : { status: 423, ok: false }));
    await mount();
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('goes to the lock screen on the app-locked event', async () => {
    fetchMock.mockResolvedValue(status({ armed: false, lockAfterSeconds: null }));
    await mount();
    act(() => {
      window.dispatchEvent(new CustomEvent(APP_LOCKED_EVENT));
    });
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('re-reads the status when app lock is turned on or off', async () => {
    fetchMock.mockResolvedValue(status({ armed: false, lockAfterSeconds: null }));
    await mount();
    await act(async () => {
      window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(calls('/api/v1/app-lock/status')).toBe(2);
  });

  it('does nothing on the lock screen or the sign-in pages', async () => {
    for (const path of ['/ds/locked', '/ds/login', '/login']) {
      pathname = path;
      (window.location as { pathname: string }).pathname = path;
      await mount();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('starts after a soft navigation from sign-in into the app, and listens to later changes', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/status') ? status() : { status: 204, ok: true }));
    pathname = '/ds/login';
    (window.location as { pathname: string }).pathname = '/ds/login';
    const r = await mount();
    expect(fetchMock).not.toHaveBeenCalled();

    pathname = '/dashboard';
    (window.location as { pathname: string }).pathname = '/dashboard';
    r.rerender(<AppLockWatcher />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(calls('/api/v1/app-lock/status')).toBe(1);
    expect(calls('/api/v1/app-lock/heartbeat')).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(calls('/api/v1/app-lock/heartbeat')).toBe(2);

    await act(async () => {
      window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(calls('/api/v1/app-lock/status')).toBe(2);
  });

  it('stops heartbeating once the page is the lock screen, without reloading it', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith('/status') ? status() : { status: 204, ok: true }));
    const r = await mount();
    const before = calls('/api/v1/app-lock/heartbeat');
    pathname = '/ds/locked';
    (window.location as { pathname: string }).pathname = '/ds/locked';
    r.rerender(<AppLockWatcher />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
      window.dispatchEvent(new CustomEvent(APP_LOCKED_EVENT));
    });
    expect(calls('/api/v1/app-lock/heartbeat')).toBe(before);
    expect(replace).not.toHaveBeenCalled();
  });
});
