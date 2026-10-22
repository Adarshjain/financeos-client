import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubLayout } from '@/test/stubLayout';

import { hapticTick } from './haptics';
import { useSwipe } from './useSwipe';

vi.mock('./haptics', () => ({ hapticTick: vi.fn() }));

beforeEach(() => {
  stubLayout('phone');
  vi.mocked(hapticTick).mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// Offset = clientX - 24 (dead zone), so threshold 50 is crossed at clientX 74.
function setup() {
  const { result } = renderHook(() => useSwipe({ threshold: 50 }));
  act(() => {
    result.current.handlers.onPointerDown({
      button: 0,
      clientX: 0,
      clientY: 0,
      target: document.createElement('div'),
    } as unknown as React.PointerEvent);
  });
  const move = (clientX: number) =>
    act(() => {
      result.current.handlers.onPointerMove({ clientX, clientY: 0 } as unknown as React.PointerEvent);
    });
  return { move };
}

describe('useSwipe haptics', () => {
  it('ticks once on crossing the threshold, not before, not again while past it', () => {
    const { move } = setup();
    move(60);
    expect(hapticTick).not.toHaveBeenCalled();
    move(80);
    expect(hapticTick).toHaveBeenCalledTimes(1);
    move(120);
    move(140);
    expect(hapticTick).toHaveBeenCalledTimes(1);
  });

  it('re-arms after dragging back under, ticks again on re-crossing', () => {
    const { move } = setup();
    move(80);
    move(60);
    move(80);
    expect(hapticTick).toHaveBeenCalledTimes(2);
  });

  it('ticks for the left direction too', () => {
    const { move } = setup();
    move(-80);
    expect(hapticTick).toHaveBeenCalledTimes(1);
    move(80);
    expect(hapticTick).toHaveBeenCalledTimes(2);
  });
});
