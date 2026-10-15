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
  const startYRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer capture fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const diff = e.clientY - startYRef.current;
    setDragOffset(diff > 0 ? diff : 0);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (dragOffset > threshold) {
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
