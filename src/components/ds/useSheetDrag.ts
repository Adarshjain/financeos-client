'use client';

import React, { useRef, useState } from 'react';

export interface UseSheetDragOptions {
  onClose?: () => void;
  threshold?: number;
}

/**
 * Shared hook for bottom sheet dragging behaviour.
 * Follows the finger down, closes past threshold (default 80px),
 * and springs back if released before threshold.
 */
export function useSheetDrag({
  onClose,
  threshold = 80,
}: UseSheetDragOptions = {}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Refs, not state: a fast swipe can release before React re-renders,
  // so the release handler must read the latest values directly.
  const draggingRef = useRef(false);
  const startYRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    draggingRef.current = true;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer capture fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setDragOffset(Math.max(0, e.clientY - startYRef.current));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (e.clientY - startYRef.current > threshold) {
      onClose?.();
    }
    setDragOffset(0);
  };

  return {
    dragOffset,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    dragProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
