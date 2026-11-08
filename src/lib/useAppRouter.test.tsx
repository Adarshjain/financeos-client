import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as busy from '@/lib/busy';
import { resetNavigationIntent, takeReplace } from '@/lib/navigationIntent';

import { useAppRouter } from './useAppRouter';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

describe('useAppRouter', () => {
  beforeEach(() => {
    Object.values(router).forEach((fn) => fn.mockClear());
    window.history.replaceState({}, '', '/accounts');
  });

  it('calls push and replace through with exactly the same args', () => {
    const { result } = renderHook(() => useAppRouter());
    result.current.push('/inbox', { scroll: false });
    result.current.replace('/inbox?x=1');
    expect(router.push).toHaveBeenCalledWith('/inbox', { scroll: false });
    expect(router.replace).toHaveBeenCalledWith('/inbox?x=1');
  });

  it('passes back, forward, refresh and prefetch through', () => {
    const { result } = renderHook(() => useAppRouter());
    result.current.back();
    result.current.forward();
    result.current.refresh();
    result.current.prefetch('/inbox');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.forward).toHaveBeenCalledTimes(1);
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(router.prefetch).toHaveBeenCalledWith('/inbox');
  });

  it('tracks the route only when the URL differs from the current one', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAppRouter());
    const shown = renderHook(() => busy.useBusyShowing());
    result.current.replace('/accounts');
    vi.advanceTimersByTime(busy.NAVIGATION_PROGRESS_DELAY_MS);
    expect(shown.result.current).toBe(false);
    result.current.replace('/accounts?page=2');
    vi.advanceTimersByTime(busy.NAVIGATION_PROGRESS_DELAY_MS);
    expect(router.replace).toHaveBeenCalledTimes(2);
    busy.resetBusy();
    vi.useRealTimers();
  });

  it('is stable for the same router instance', () => {
    const { result, rerender } = renderHook(() => useAppRouter());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('marks a replace onto another page, but not a same-page replace or a push', () => {
    resetNavigationIntent();
    const { result } = renderHook(() => useAppRouter());
    result.current.replace('/accounts?tab=b');
    expect(takeReplace('/accounts')).toBe(false);
    result.current.push('/loans');
    expect(takeReplace('/loans')).toBe(false);
    result.current.replace('/loans', { scroll: false });
    expect(takeReplace('/loans')).toBe(true);
  });
});
