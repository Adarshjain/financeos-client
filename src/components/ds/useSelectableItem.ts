'use client';

import { useLongPress, usePress } from '@react-aria/interactions';
import React, { useEffect, useRef } from 'react';
import { mergeProps } from 'react-aria';

import { hapticTick } from './haptics';
import { isPhoneLayout } from './phoneLayout';

/** Where a press happened, in viewport coordinates: the pointer, or the item's bottom-left for a keyboard press. */
export interface PressPoint {
  x: number;
  y: number;
}

/** Where a click happened: the pointer, or the control's bottom-left when a key triggered it (detail 0). */
export function clickPoint(e: React.MouseEvent<HTMLElement>): PressPoint {
  if (e.detail === 0) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: rect.left, y: rect.bottom };
  }
  return { x: e.clientX, y: e.clientY };
}

export interface UseSelectableItemOptions {
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  selectionMode?: boolean;
  onPress?: (point: PressPoint) => void;
  disabled?: boolean;
  longPressThreshold?: number;
}

const MOVE_TOLERANCE = 10;

export function useSelectableItem({
  selectable = false,
  selected = false,
  onSelectedChange,
  selectionMode = false,
  onPress,
  disabled = false,
  longPressThreshold = 500,
}: UseSelectableItemOptions) {
  const moved = useRef(false);

  // Long-press and tap-to-toggle belong to the phone layout only, with any pointer
  // (owner, 2026-10-18); on desktop a press always opens and the checkbox selects.
  const { longPressProps: anyLayoutLongPressProps } = useLongPress({
    threshold: longPressThreshold,
    isDisabled: disabled || !selectable,
    onLongPress: () => {
      if (moved.current) return;
      if (!selected) {
        hapticTick();
        onSelectedChange?.(true);
      }
    },
  });

  // The layout is read when the press starts, never while rendering (RULES §5c.3): in the
  // desktop layout the long-press never starts, so it never cancels the press either.
  const longPressProps = { ...anyLayoutLongPressProps } as Record<string, unknown>;
  for (const start of ['onPointerDown', 'onMouseDown', 'onTouchStart'] as const) {
    const handler = anyLayoutLongPressProps[start] as ((e: React.SyntheticEvent) => void) | undefined;
    if (handler) longPressProps[start] = (e: React.SyntheticEvent) => {
      if (isPhoneLayout()) handler(e);
    };
  }

  const ctrlDown = useRef(false);
  const lastPointer = useRef<PressPoint | null>(null);
  const { pressProps } = usePress({
    isDisabled: disabled,
    // usePress stops propagation of the events it handles unless told otherwise;
    // without these, an ancestor's pointerdown/click (SwipeActions) never fires.
    onPressStart: (e) => e.continuePropagation(),
    onPressUp: (e) => e.continuePropagation(),
    onPressEnd: (e) => e.continuePropagation(),
    onPress: (e) => {
      e.continuePropagation();
      if (moved.current) return;
      // macOS Ctrl+click is a right-click: the context menu opens, the row must not. The press completes on a
      // click React Aria synthesizes itself (no ctrlKey), so the key is read from the pointerdown.
      if (ctrlDown.current && !isPhoneLayout()) return;
      if (isPhoneLayout() && selectable && (selectionMode || selected)) onSelectedChange?.(!selected);
      else if (onPress) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const fromPointer = e.pointerType !== 'keyboard' && e.pointerType !== 'virtual';
        onPress(
          fromPointer && lastPointer.current
            ? lastPointer.current
            : { x: rect.left, y: fromPointer ? rect.top : rect.bottom },
        );
      }
    },
  });

  // Movement guard. Listen on window, not on the item: SwipeActions calls
  // setPointerCapture on its wrapper after ~5px, after which the item itself
  // never sees another pointermove.
  const stopTracking = useRef<(() => void) | null>(null);
  useEffect(() => () => stopTracking.current?.(), []);

  const movementProps: React.HTMLAttributes<HTMLElement> = {
    onPointerDown: (e) => {
      ctrlDown.current = e.ctrlKey;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      stopTracking.current?.();
      const origin = { x: e.clientX, y: e.clientY };
      moved.current = false;
      const onMove = (ev: PointerEvent) => {
        if (
          Math.abs(ev.clientX - origin.x) > MOVE_TOLERANCE ||
          Math.abs(ev.clientY - origin.y) > MOVE_TOLERANCE
        ) {
          moved.current = true;
        }
      };
      const done = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', done);
        window.removeEventListener('pointercancel', done);
        stopTracking.current = null;
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', done);
      window.addEventListener('pointercancel', done);
      stopTracking.current = done;
    },
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const nestedControlProps: React.HTMLAttributes<HTMLElement> = {
    onPointerDown: stop,
    onPointerUp: stop,
    onClick: stop,
    onKeyDown: stop,
  };

  // eslint-disable-next-line react-hooks/refs
  const itemProps = mergeProps(pressProps, longPressProps, movementProps) as React.HTMLAttributes<HTMLElement>;
  return { itemProps, nestedControlProps };
}
