import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSwipe } from './useSwipe';

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
        clientX: 60,
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

  it('ignores a mouse: swipe is touch only', () => {
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
    expect(result.current.isDragging).toBe(false);

    act(() => {
      result.current.handlers.onPointerMove({ clientX: 60, clientY: 0 } as unknown as React.PointerEvent);
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
        clientX: 40,
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
        clientX: 80,
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
});
