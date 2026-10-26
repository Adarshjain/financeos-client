import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHideOnScroll } from '../useHideOnScroll';

let pathname = '/ds/transactions';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

let scrollY = 0;

beforeEach(() => {
  pathname = '/ds/transactions';
  scrollY = 0;
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 3000 });
  // Run each frame at once so a scroll event updates synchronously.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const scrollTo = (y: number) => {
  act(() => {
    scrollY = y;
    window.dispatchEvent(new Event('scroll'));
  });
};

describe('useHideOnScroll', () => {
  it('shows at first', () => {
    const { result } = renderHook(() => useHideOnScroll());
    expect(result.current).toBe(false);
  });

  it('hides on scroll down and shows again on scroll up', () => {
    const { result } = renderHook(() => useHideOnScroll());
    scrollTo(200);
    expect(result.current).toBe(true);
    scrollTo(150);
    expect(result.current).toBe(false);
  });

  it('ignores moves smaller than the tolerance', () => {
    const { result } = renderHook(() => useHideOnScroll());
    scrollTo(200);
    scrollTo(196);
    expect(result.current).toBe(true);
  });

  it('shows near the top even while scrolling down', () => {
    const { result } = renderHook(() => useHideOnScroll());
    scrollTo(200);
    scrollTo(4);
    expect(result.current).toBe(false);
  });

  it('treats the rubber band past the bottom as no movement', () => {
    const { result } = renderHook(() => useHideOnScroll());
    scrollTo(2200); // the bottom (3000 - 800)
    expect(result.current).toBe(true);
    scrollTo(2260); // bounce past the end
    scrollTo(2200); // settles back: clamped, so no scroll up
    expect(result.current).toBe(true);
  });

  it('treats the rubber band above the top as the top', () => {
    const { result } = renderHook(() => useHideOnScroll());
    scrollTo(200);
    scrollTo(-40);
    expect(result.current).toBe(false);
  });

  it('shows again on a route change', () => {
    const { result, rerender } = renderHook(() => useHideOnScroll());
    scrollTo(200);
    expect(result.current).toBe(true);
    pathname = '/ds/accounts';
    rerender();
    expect(result.current).toBe(false);
  });

  it('stops listening on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useHideOnScroll());
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
