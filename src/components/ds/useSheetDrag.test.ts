import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSheetDrag } from './useSheetDrag';

describe('useSheetDrag', () => {
  it('returns only dragProps, dragOffset, reset, and isDragging without loose handlers', () => {
    const { result } = renderHook(() => useSheetDrag());
    expect(Object.keys(result.current).sort()).toEqual([
      'dragOffset',
      'dragProps',
      'isDragging',
      'reset',
    ]);
    expect(result.current.dragProps).toBeDefined();
    expect(typeof result.current.dragProps.onPointerDown).toBe('function');
    expect(typeof result.current.dragProps.onPointerMove).toBe('function');
    expect(typeof result.current.dragProps.onPointerUp).toBe('function');
    expect(typeof result.current.dragProps.onPointerCancel).toBe('function');
  });

  it('tracks downward dragging distance', () => {
    const { result } = renderHook(() => useSheetDrag({ threshold: 80 }));

    act(() => {
      result.current.dragProps.onPointerDown({
        clientY: 100,
        pointerId: 1,
        currentTarget: {
          setPointerCapture: vi.fn(),
        },
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.dragOffset).toBe(0);

    act(() => {
      result.current.dragProps.onPointerMove({
        clientY: 150,
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(result.current.dragOffset).toBe(50);
  });

  it('does not allow dragging upward past 0', () => {
    const { result } = renderHook(() => useSheetDrag());

    act(() => {
      result.current.dragProps.onPointerDown({
        clientY: 100,
        pointerId: 1,
        currentTarget: { setPointerCapture: vi.fn() },
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.dragProps.onPointerMove({
        clientY: 50,
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(result.current.dragOffset).toBe(0);
  });

  it('triggers onClose when released past threshold', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useSheetDrag({ onClose, threshold: 80 }));

    act(() => {
      result.current.dragProps.onPointerDown({
        clientY: 100,
        pointerId: 1,
        currentTarget: { setPointerCapture: vi.fn() },
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.dragProps.onPointerMove({
        clientY: 190,
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.dragProps.onPointerUp({
        clientY: 190,
        pointerId: 1,
        currentTarget: { releasePointerCapture: vi.fn() },
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.isDragging).toBe(false);
    // Keeps offset for exit animation
    expect(result.current.dragOffset).toBe(90);
  });

  it('springs back to 0 when released before threshold', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useSheetDrag({ onClose, threshold: 80, velocityThreshold: 999 }),
    );

    act(() => {
      result.current.dragProps.onPointerDown({
        clientY: 100,
        pointerId: 1,
        currentTarget: { setPointerCapture: vi.fn() },
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.dragProps.onPointerMove({
        clientY: 130,
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.dragProps.onPointerUp({
        clientY: 130,
        pointerId: 1,
        currentTarget: { releasePointerCapture: vi.fn() },
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragOffset).toBe(0);
  });

  it('resets dragOffset and isDragging when reset is called', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useSheetDrag({ onClose, threshold: 50 }));

    act(() => {
      result.current.dragProps.onPointerDown({
        clientY: 100,
        pointerId: 1,
        currentTarget: { setPointerCapture: vi.fn() },
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.dragProps.onPointerMove({
        clientY: 180,
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    act(() => {
      result.current.dragProps.onPointerUp({
        clientY: 180,
        pointerId: 1,
        currentTarget: { releasePointerCapture: vi.fn() },
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(result.current.dragOffset).toBe(80);

    act(() => {
      result.current.reset();
    });

    expect(result.current.dragOffset).toBe(0);
    expect(result.current.isDragging).toBe(false);
  });
});
