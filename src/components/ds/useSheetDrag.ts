'use client';

import React, { useCallback, useRef, useState } from 'react';

export interface UseSheetDragOptions {
  onClose?: () => void;
  threshold?: number;
  velocityThreshold?: number;
}

/**
 * Shared hook for bottom sheet dragging behaviour.
 * Follows the finger down, closes past threshold (default 80px),
 * and springs back if released before threshold.
 */
export function useSheetDrag({
  onClose,
  threshold = 80,
  velocityThreshold = 0.5,
}: UseSheetDragOptions = {}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Refs, not state: a fast swipe can release before React re-renders,
  // so the release handler must read the latest values directly.
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    draggingRef.current = true;
    setDragOffset(0);
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer capture fallback
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setDragOffset(Math.max(0, e.clientY - startYRef.current));
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const distance = e.clientY - startYRef.current;
    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = distance / elapsed;

    const isPastDistance = distance > threshold;
    const isFastFlick =
      velocityThreshold !== undefined &&
      velocity > velocityThreshold &&
      distance > 20;

    if (isPastDistance || isFastFlick) {
      // Keep the offset: the closing animation slides on from where the finger let go.
      onClose?.();
      return;
    }
    setDragOffset(0);
  }, [onClose, threshold, velocityThreshold]);

  // A drag that closes the sheet leaves its offset in place so the exit slides on
  // from the finger. Callers reset once the sheet has unmounted, or it would reopen
  // at that offset.
  const reset = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  }, []);

  return {
    dragOffset,
    reset,
    isDragging,
    dragProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
