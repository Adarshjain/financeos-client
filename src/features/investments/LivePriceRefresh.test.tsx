import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LIVE_REFRESH_MS, LivePriceRefresh } from './LivePriceRefresh';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

// Tuesday 2026-10-13, IST = UTC + 5:30.
const OPEN = '2026-10-13T06:15:00Z'; // 11:45
const NEAR_CLOSE = '2026-10-13T10:03:00Z'; // 15:33
const CLOSED = '2026-10-13T12:00:00Z'; // 17:30

let visibility = 'visible';
const minutes = (n: number) => n * 60_000;

beforeEach(() => {
  refresh.mockClear();
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

function mountAt(iso: string) {
  vi.setSystemTime(new Date(iso));
  return render(<LivePriceRefresh />);
}

describe('LivePriceRefresh', () => {
  it('renders nothing and does not refresh on mount', () => {
    const { container } = mountAt(OPEN);
    expect(container.innerHTML).toBe('');
    vi.advanceTimersByTime(minutes(1));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes after the interval when open and visible, then waits again', () => {
    mountAt(OPEN);
    vi.advanceTimersByTime(LIVE_REFRESH_MS - minutes(1));
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(minutes(1));
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(minutes(4));
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(minutes(1));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does not refresh while the tab is hidden', () => {
    mountAt(OPEN);
    visibility = 'hidden';
    vi.advanceTimersByTime(minutes(10));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not refresh when the market is closed', () => {
    mountAt(CLOSED);
    vi.advanceTimersByTime(minutes(30));
    window.dispatchEvent(new Event('focus'));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes on focus only after 30 seconds since the last refresh', () => {
    mountAt(OPEN);
    vi.advanceTimersByTime(20_000);
    window.dispatchEvent(new Event('focus'));
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(15_000);
    window.dispatchEvent(new Event('focus'));
    expect(refresh).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('focus'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the tab becomes visible again after 30 seconds', () => {
    mountAt(OPEN);
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(40_000);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes once when the market goes from open to closed', () => {
    mountAt(NEAR_CLOSE);
    vi.advanceTimersByTime(minutes(1)); // 15:34, still open, under 5 minutes
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(minutes(1)); // 15:35, closed
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(minutes(30));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('waits for a tab hidden at the close to be seen again, then refreshes once', () => {
    mountAt(NEAR_CLOSE);
    visibility = 'hidden';
    vi.advanceTimersByTime(minutes(30)); // closes while hidden
    expect(refresh).not.toHaveBeenCalled();
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(minutes(30));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes on return when timers were frozen through the close', () => {
    mountAt(NEAR_CLOSE);
    vi.setSystemTime(new Date(CLOSED)); // clock moves on, no timer ran
    window.dispatchEvent(new Event('focus'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('removes its listeners and timer on unmount', () => {
    const { unmount } = mountAt(OPEN);
    unmount();
    vi.advanceTimersByTime(minutes(10));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).not.toHaveBeenCalled();
  });
});
