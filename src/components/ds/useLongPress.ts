'use client';

import React, { useCallback, useRef } from 'react';

export interface UseLongPressOptions {
  onLongPress?: () => void;
  disabled?: boolean;
  delay?: number;
}

export function useLongPress({
  onLongPress,
  disabled = false,
  delay = 450,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTriggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.pointerType !== 'touch') return;
      clear();
      isTriggeredRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        isTriggeredRef.current = true;
        onLongPress?.();
      }, delay);
    },
    [disabled, delay, onLongPress, clear],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current || e.pointerType !== 'touch') return;
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clear();
      }
    },
    [clear],
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      clear();
    },
    [clear],
  );

  const onPointerCancel = useCallback(
    (_e: React.PointerEvent) => {
      clear();
    },
    [clear],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || e.touches.length !== 1) return;
      clear();
      isTriggeredRef.current = false;
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      timerRef.current = setTimeout(() => {
        isTriggeredRef.current = true;
        onLongPress?.();
      }, delay);
    },
    [disabled, delay, onLongPress, clear],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startPosRef.current || e.touches.length !== 1) return;
      const dx = Math.abs(e.touches[0].clientX - startPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clear();
      }
    },
    [clear],
  );

  const onTouchEnd = useCallback(
    (_e: React.TouchEvent) => {
      clear();
    },
    [clear],
  );

  const onTouchCancel = useCallback(
    (_e: React.TouchEvent) => {
      clear();
    },
    [clear],
  );

  const consumeTriggered = useCallback(() => {
    const wasTriggered = isTriggeredRef.current;
    isTriggeredRef.current = false;
    return wasTriggered;
  }, []);

  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };

  return {
    handlers,
    consumeTriggered,
  };
}
