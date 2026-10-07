'use client';

import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import {
  computeSwipeOffset,
  isCommitted,
  resolveAxis,
  type SwipeAxis,
} from './swipe-action-row.helpers';

export interface SwipeAction {
  label: string;
  icon: LucideIcon;
  tone: 'success' | 'danger';
  onCommit: () => void;
}

interface SwipeActionRowProps {
  /** Revealed on the left while swiping right. */
  leading?: SwipeAction;
  /** Revealed on the right while swiping left. */
  trailing?: SwipeAction;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

const TONE_CLASS: Record<SwipeAction['tone'], string> = {
  success: 'bg-emerald-600 text-white',
  danger: 'bg-rose-600 text-white',
};

/*
 * Wraps a row so a horizontal touch swipe reveals an action behind it and
 * commits that action on release past the threshold. Only touch pointers
 * swipe, so mouse users see no change. `touch-pan-y` hands vertical panning
 * to the browser and horizontal movement to us; a gesture locks to one axis
 * after a few pixels and never switches. A horizontal gesture also swallows
 * the click that may follow it so the row's own tap handler (a dialog
 * trigger, a checkbox) does not fire from a swipe.
 */
export function SwipeActionRow({
  leading,
  trailing,
  disabled,
  className,
  children,
}: SwipeActionRowProps) {
  const [dx, setDx] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dxRef = React.useRef(0);
  const startRef = React.useRef<{ x: number; y: number; id: number } | null>(null);
  const axisRef = React.useRef<SwipeAxis | null>(null);
  const suppressClickRef = React.useRef(false);

  const sides = { hasLeading: Boolean(leading), hasTrailing: Boolean(trailing) };

  const reset = () => {
    startRef.current = null;
    axisRef.current = null;
    dxRef.current = 0;
    setDx(0);
    setDragging(false);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // A new press always starts clean: if the browser never delivered the
    // click after the previous swipe, the stale flag must not eat this tap.
    suppressClickRef.current = false;
    if (disabled || e.pointerType !== 'touch' || !e.isPrimary) return;
    startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    axisRef.current = null;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    if (!start || e.pointerId !== start.id) return;
    const rawDx = e.clientX - start.x;
    const rawDy = e.clientY - start.y;

    if (axisRef.current === null) {
      const axis = resolveAxis(rawDx, rawDy);
      if (axis === null) return;
      axisRef.current = axis;
      if (axis === 'horizontal') {
        suppressClickRef.current = true;
        capturePointer(e.currentTarget, e.pointerId);
        setDragging(true);
      }
    }
    if (axisRef.current !== 'horizontal') return;

    const next = computeSwipeOffset(rawDx, sides);
    dxRef.current = next;
    setDx(next);
  };

  const endGesture = (e: React.PointerEvent<HTMLDivElement>, allowCommit: boolean) => {
    const start = startRef.current;
    if (!start || e.pointerId !== start.id) return;
    if (axisRef.current === 'horizontal') {
      releasePointer(e.currentTarget, e.pointerId);
      const offset = dxRef.current;
      if (allowCommit && isCommitted(offset)) {
        const action = offset > 0 ? leading : trailing;
        action?.onCommit();
      }
    }
    reset();
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const armed = isCommitted(dx);
  const active = dx > 0 ? leading : dx < 0 ? trailing : undefined;

  return (
    <div
      data-slot="swipe-action-row"
      data-armed={armed ? 'true' : undefined}
      className={cn('relative overflow-hidden touch-pan-y', className)}
    >
      {active && (
        <div
          aria-hidden="true"
          data-slot="swipe-action-row-backdrop"
          className={cn(
            'absolute inset-0 flex items-center',
            dx > 0 ? 'justify-start pl-4' : 'justify-end pr-4',
            TONE_CLASS[active.tone],
            armed ? 'opacity-100' : 'opacity-80',
          )}
        >
          <active.icon className={cn('h-4 w-4 transition-transform', armed && 'scale-110')} />
          <span className="ml-2 text-xs font-semibold">{active.label}</span>
        </div>
      )}
      <div
        data-slot="swipe-action-row-content"
        className={cn(
          'relative transition-transform duration-200 ease-out motion-reduce:transition-none',
          dragging && 'transition-none select-none',
        )}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endGesture(e, true)}
        onPointerCancel={(e) => endGesture(e, false)}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}

/* jsdom has no pointer capture and Safari throws once the pointer is gone,
 * so both calls are best-effort. */
function capturePointer(el: HTMLElement, pointerId: number) {
  if (typeof el.setPointerCapture !== 'function') return;
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // Pointer already released; nothing to capture.
  }
}

function releasePointer(el: HTMLElement, pointerId: number) {
  if (typeof el.releasePointerCapture !== 'function') return;
  try {
    el.releasePointerCapture(pointerId);
  } catch {
    // Capture was never taken or already lost.
  }
}
