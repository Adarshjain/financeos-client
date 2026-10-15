import { useCallback, useRef, useState } from 'react';

export interface UseSwipeOptions {
  threshold?: number;
  disabled?: boolean;
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe({
  threshold = 96,
  disabled = false,
  canSwipeLeft = true,
  canSwipeRight = true,
  onSwipeLeft,
  onSwipeRight,
}: UseSwipeOptions) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const isScrolling = useRef(false);
  const draggingRef = useRef(false);
  const currentOffset = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea')) return;

      startX.current = e.clientX;
      startY.current = e.clientY;
      isScrolling.current = false;
      draggingRef.current = true;
      currentOffset.current = 0;
      setIsDragging(true);
      setOffset(0);
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current || isScrolling.current) return;

      const deltaX = e.clientX - startX.current;
      const deltaY = e.clientY - startY.current;

      // Vertical scroll takes priority if deltaY > deltaX
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        isScrolling.current = true;
        draggingRef.current = false;
        setIsDragging(false);
        setOffset(0);
        return;
      }

      if (Math.abs(deltaX) > 5 && typeof e.currentTarget?.setPointerCapture === 'function') {
        try {
          if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        } catch {
          // Ignore
        }
      }

      let nextOffset = deltaX;
      if (nextOffset > 0 && !canSwipeRight) {
        nextOffset = 0;
      } else if (nextOffset < 0 && !canSwipeLeft) {
        nextOffset = 0;
      }

      currentOffset.current = nextOffset;
      setOffset(nextOffset);
    },
    [canSwipeLeft, canSwipeRight],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (typeof e.currentTarget?.releasePointerCapture === 'function') {
        try {
          if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignore
        }
      }

      if (!draggingRef.current) return;

      draggingRef.current = false;
      setIsDragging(false);

      const finalOffset = currentOffset.current;
      if (finalOffset >= threshold && canSwipeRight) {
        onSwipeRight?.();
      } else if (finalOffset <= -threshold && canSwipeLeft) {
        onSwipeLeft?.();
      }

      currentOffset.current = 0;
      setOffset(0);
    },
    [canSwipeLeft, canSwipeRight, onSwipeLeft, onSwipeRight, threshold],
  );

  return {
    offset,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
