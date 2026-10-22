import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { stubLayout } from '@/test/stubLayout';

import { useSwipe } from './useSwipe';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useSwipe', () => {
  it('triggers onSwipeRight when dragging past positive threshold', () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useSwipe({ threshold: 50, onSwipeRight, onSwipeLeft }),
    );

    act(() => {
      result.current.handlers.onPointerDown({
        button: 0,
        pointerType: 'touch',
        clientX: 0,
        clientY: 0,
        target: document.createElement('div'),
      } as unknown as React.PointerEvent);
    });

    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.handlers.onPointerMove({
        clientX: 84,
        clientY: 0,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.offset).toBe(60);

    act(() => {
      result.current.handlers.onPointerUp({} as React.PointerEvent);
    });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.offset).toBe(0);
  });

  // Swipe belongs to the phone layout, with any pointer (owner, 2026-10-18).
  it('a mouse swipes in the phone layout', () => {
    stubLayout('phone');
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipe({ threshold: 50, onSwipeRight }));

    act(() => {
      result.current.handlers.onPointerDown({
        button: 0,
        pointerType: 'mouse',
        clientX: 0,
        clientY: 0,
        target: document.createElement('div'),
      } as unknown as React.PointerEvent);
    });
    expect(result.current.isDragging).toBe(true);
    act(() => {
      result.current.handlers.onPointerMove({ clientX: 84, clientY: 0 } as unknown as React.PointerEvent);
    });
    act(() => {
      result.current.handlers.onPointerUp({} as unknown as React.PointerEvent);
    });
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it.each([['touch'], ['mouse']])('ignores a %s drag in the desktop layout', (pointerType) => {
    stubLayout('desktop');
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipe({ threshold: 50, onSwipeRight }));

    act(() => {
      result.current.handlers.onPointerDown({
        button: 0,
        pointerType,
        clientX: 0,
        clientY: 0,
        target: document.createElement('div'),
      } as unknown as React.PointerEvent);
    });
    expect(result.current.isDragging).toBe(false);

    act(() => {
      result.current.handlers.onPointerMove({ clientX: 84, clientY: 0 } as unknown as React.PointerEvent);
    });
    expect(result.current.offset).toBe(0);
    act(() => {
      result.current.handlers.onPointerUp({} as unknown as React.PointerEvent);
    });
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('triggers onSwipeLeft when dragging past negative threshold', () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useSwipe({ threshold: 50, onSwipeRight, onSwipeLeft }),
    );

    act(() => {
      result.current.handlers.onPointerDown({
        button: 0,
        pointerType: 'touch',
        clientX: 100,
        clientY: 0,
        target: document.createElement('div'),
      } as unknown as React.PointerEvent);
    });

    act(() => {
      result.current.handlers.onPointerMove({
        clientX: 16,
        clientY: 0,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.offset).toBe(-60);

    act(() => {
      result.current.handlers.onPointerUp({} as React.PointerEvent);
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('onPointerCancel clears drag and offset without triggering callbacks', () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useSwipe({ threshold: 50, onSwipeRight, onSwipeLeft }),
    );

    act(() => {
      result.current.handlers.onPointerDown({
        button: 0,
        pointerType: 'touch',
        clientX: 0,
        clientY: 0,
        target: document.createElement('div'),
      } as unknown as React.PointerEvent);
    });

    act(() => {
      result.current.handlers.onPointerMove({
        clientX: 104,
        clientY: 0,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.offset).toBe(80);
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.handlers.onPointerCancel({} as React.PointerEvent);
    });

    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.offset).toBe(0);
  });

  it('cancels drag if vertical movement exceeds horizontal movement', () => {
    const { result } = renderHook(() => useSwipe({ threshold: 50 }));

    act(() => {
      result.current.handlers.onPointerDown({
        button: 0,
        pointerType: 'touch',
        clientX: 0,
        clientY: 0,
        target: document.createElement('div'),
      } as unknown as React.PointerEvent);
    });

    act(() => {
      result.current.handlers.onPointerMove({
        clientX: 5,
        clientY: 20,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.offset).toBe(0);
  });

  describe('horizontal dead zone', () => {
    const start = (result: { current: ReturnType<typeof useSwipe> }) =>
      act(() => {
        result.current.handlers.onPointerDown({
          button: 0,
          pointerType: 'touch',
          clientX: 0,
          clientY: 0,
          target: document.createElement('div'),
        } as unknown as React.PointerEvent);
      });
    const move = (result: { current: ReturnType<typeof useSwipe> }, clientX: number, clientY: number) =>
      act(() => {
        result.current.handlers.onPointerMove({ clientX, clientY } as unknown as React.PointerEvent);
      });

    it('a small diagonal scroll does not move the row', () => {
      const { result } = renderHook(() => useSwipe({ threshold: 96 }));
      start(result);
      move(result, 10, 6);
      expect(result.current.offset).toBe(0);
      move(result, 20, 8);
      expect(result.current.offset).toBe(0);
      expect(result.current.isDragging).toBe(true);
    });

    it('stays still past 24px while vertical movement is as large as horizontal', () => {
      const { result } = renderHook(() => useSwipe({ threshold: 96 }));
      start(result);
      move(result, 30, 30);
      expect(result.current.offset).toBe(0);
    });

    it('translates by dx minus 24 once past the dead zone', () => {
      const { result } = renderHook(() => useSwipe({ threshold: 96 }));
      start(result);
      move(result, 24, 0);
      expect(result.current.offset).toBe(0);
      move(result, 50, 4);
      expect(result.current.offset).toBe(26);
      move(result, -50, 4);
      expect(result.current.offset).toBe(-26);
    });

    it('commits only when the offset reaches the threshold', () => {
      const onSwipeRight = vi.fn();
      const { result } = renderHook(() => useSwipe({ threshold: 96, onSwipeRight }));
      start(result);
      move(result, 119, 0);
      act(() => result.current.handlers.onPointerUp({} as React.PointerEvent));
      expect(onSwipeRight).not.toHaveBeenCalled();

      start(result);
      move(result, 120, 0);
      expect(result.current.offset).toBe(96);
      act(() => result.current.handlers.onPointerUp({} as React.PointerEvent));
      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it('vertical lead before engaging locks the gesture to scrolling', () => {
      const { result } = renderHook(() => useSwipe({ threshold: 96 }));
      start(result);
      move(result, 4, 12);
      move(result, 80, 12);
      expect(result.current.isDragging).toBe(false);
      expect(result.current.offset).toBe(0);
    });
  });
});
