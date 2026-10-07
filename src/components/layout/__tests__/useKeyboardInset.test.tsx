import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installFakeVisualViewport } from '@/test/fakeVisualViewport';

import { computeKeyboardInset, KEYBOARD_MIN_INSET, useKeyboardInset } from '../useKeyboardInset';

describe('computeKeyboardInset', () => {
  it('is the layout/visual viewport gap, including the pan offset', () => {
    expect(computeKeyboardInset({ height: 400, offsetTop: 0, scale: 1 }, 700)).toBe(300);
    // iOS panned the visual viewport 50px down to reveal the focused field.
    expect(computeKeyboardInset({ height: 400, offsetTop: 50, scale: 1 }, 700)).toBe(250);
  });

  it('is 0 when the viewports match (keyboard closed, or Android resizes-content)', () => {
    expect(computeKeyboardInset({ height: 700, offsetTop: 0, scale: 1 }, 700)).toBe(0);
  });

  it('ignores toolbar-collapse drift below the keyboard threshold', () => {
    const drift = KEYBOARD_MIN_INSET - 1;
    expect(computeKeyboardInset({ height: 700 - drift, offsetTop: 0, scale: 1 }, 700)).toBe(0);
    expect(
      computeKeyboardInset({ height: 700 - KEYBOARD_MIN_INSET, offsetTop: 0, scale: 1 }, 700),
    ).toBe(KEYBOARD_MIN_INSET);
  });

  it('ignores a pinch-zoomed page', () => {
    expect(computeKeyboardInset({ height: 350, offsetTop: 100, scale: 2 }, 700)).toBe(0);
  });

  it('never goes negative', () => {
    expect(computeKeyboardInset({ height: 800, offsetTop: 0, scale: 1 }, 700)).toBe(0);
  });

  it('rounds sub-pixel values', () => {
    expect(computeKeyboardInset({ height: 399.6, offsetTop: 0, scale: 1 }, 700)).toBe(300);
  });
});

describe('useKeyboardInset', () => {
  let installed: ReturnType<typeof installFakeVisualViewport> | undefined;

  afterEach(() => {
    installed?.uninstall();
    installed = undefined;
  });

  it('is 0 in browsers without visualViewport', () => {
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
  });

  it('reads an inset already present at mount', () => {
    installed = installFakeVisualViewport({ height: window.innerHeight - 300 });
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(300);
  });

  it('tracks visualViewport resize and scroll events', () => {
    const fake = installFakeVisualViewport();
    installed = fake;
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);

    act(() => fake.set({ height: window.innerHeight - 320 }, 'resize'));
    expect(result.current).toBe(320);

    act(() => fake.set({ offsetTop: 40 }, 'scroll'));
    expect(result.current).toBe(280);

    act(() => fake.set({ height: window.innerHeight, offsetTop: 0 }, 'resize'));
    expect(result.current).toBe(0);
  });

  it('unsubscribes from both events on unmount', () => {
    const fake = installFakeVisualViewport();
    installed = fake;
    const remove = vi.spyOn(fake.vv, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardInset());
    unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
