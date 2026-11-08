import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  beginBusy,
  endRoute,
  NAVIGATION_PROGRESS_DELAY_MS,
  NAVIGATION_PROGRESS_TIMEOUT_MS,
  resetBusy,
  trackRoute,
  useBusyShowing,
} from './busy';

const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('busy store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/accounts?tab=a');
  });
  afterEach(() => {
    act(() => resetBusy());
    vi.useRealTimers();
  });
  const showing = () => renderHook(() => useBusyShowing());

  it('shows only after the delay', () => {
    const { result } = showing();
    act(() => void beginBusy());
    expect(result.current).toBe(false);
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(result.current).toBe(true);
  });

  it('never shows for work that ends before the delay', () => {
    const { result } = showing();
    const end = beginBusy();
    wait(NAVIGATION_PROGRESS_DELAY_MS - 20);
    act(() => end());
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(result.current).toBe(false);
  });

  it('end is idempotent and cannot release another token', () => {
    const { result } = showing();
    const a = beginBusy();
    const b = beginBusy();
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    act(() => {
      a();
      a();
    });
    expect(result.current).toBe(true);
    act(() => b());
    expect(result.current).toBe(false);
  });

  it('stays visible until every token has ended', () => {
    const { result } = showing();
    const a = beginBusy();
    const b = beginBusy();
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    act(() => a());
    expect(result.current).toBe(true);
    act(() => b());
    expect(result.current).toBe(false);
  });

  it('gives up at the timeout and a late end does nothing', () => {
    const { result } = showing();
    const end = beginBusy();
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    wait(NAVIGATION_PROGRESS_TIMEOUT_MS);
    expect(result.current).toBe(false);
    const next = beginBusy();
    act(() => end());
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(result.current).toBe(true);
    act(() => next());
  });

  it('a route to a different URL is pending until endRoute, shown after the delay', () => {
    const { result } = showing();
    act(() => trackRoute('/accounts?tab=b'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(result.current).toBe(true);
    act(() => endRoute());
    expect(result.current).toBe(false);
  });

  it('a route to the current URL does nothing', () => {
    const { result } = showing();
    act(() => trackRoute('/accounts?tab=a'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(result.current).toBe(false);
  });

  it('a route pending gives up at the timeout', () => {
    const { result } = showing();
    act(() => trackRoute('/inbox'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    wait(NAVIGATION_PROGRESS_TIMEOUT_MS);
    expect(result.current).toBe(false);
  });

  it('a route back to the current URL ends a pending one the router dropped', () => {
    const { result } = showing();
    act(() => trackRoute('/accounts?tab=b'));
    act(() => trackRoute('/accounts?tab=a'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(result.current).toBe(false);
  });

  it('compares the query the way useSearchParams spells it', () => {
    window.history.replaceState({}, '', '/accounts?q=a%20b');
    const { result } = showing();
    act(() => trackRoute('/accounts?q=a+b'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(result.current).toBe(false);
  });
});
