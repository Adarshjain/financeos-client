'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    dragOffsetRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer capture fallback
    }

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const diff = moveEv.clientY - startYRef.current;
      const offset = diff > 0 ? diff : 0;
      dragOffsetRef.current = offset;
      setDragOffset(offset);
    };

    const finishDrag = (upClientY: number) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      const diff = upClientY - startYRef.current;
      if (diff > threshold || dragOffsetRef.current > threshold) {
        onCloseRef.current?.();
      }
      dragOffsetRef.current = 0;
      setDragOffset(0);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      finishDrag(upEv.clientY);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const diff = e.clientY - startYRef.current;
    const offset = diff > 0 ? diff : 0;
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const diff = e.clientY - startYRef.current;
    if (diff > threshold || dragOffsetRef.current > threshold) {
      onCloseRef.current?.();
    }
    dragOffsetRef.current = 0;
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
