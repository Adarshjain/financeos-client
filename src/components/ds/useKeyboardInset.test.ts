import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { computeKeyboardInset, useDsKeyboardInset } from './useKeyboardInset';

const get = () => document.documentElement.style.getPropertyValue('--ds-keyboard-inset');

function stubViewport(height: number, offsetTop = 0, scale = 1) {
  const target = new EventTarget();
  Object.assign(target, { height, offsetTop, scale });
  Object.defineProperty(window, 'visualViewport', { value: target, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  return target as unknown as VisualViewport & EventTarget;
}

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
});

describe('computeKeyboardInset', () => {
  it('is the gap between the viewports, 0 for small drift or zoom', () => {
    expect(computeKeyboardInset({ height: 500, offsetTop: 0, scale: 1 }, 800)).toBe(300);
    expect(computeKeyboardInset({ height: 780, offsetTop: 0, scale: 1 }, 800)).toBe(0);
    expect(computeKeyboardInset({ height: 400, offsetTop: 0, scale: 2 }, 800)).toBe(0);
  });
});

describe('useDsKeyboardInset', () => {
  it('writes the property, follows viewport resize, and removes it with the last sheet', () => {
    const vv = stubViewport(800);
    const a = renderHook(() => useDsKeyboardInset());
    const b = renderHook(() => useDsKeyboardInset());
    expect(get()).toBe('0px');
    (vv as unknown as { height: number }).height = 500;
    vv.dispatchEvent(new Event('resize'));
    expect(get()).toBe('300px');
    a.unmount();
    expect(get()).toBe('300px');
    b.unmount();
    expect(get()).toBe('');
  });
});
