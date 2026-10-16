'use client';

import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { useSwipe } from '../useSwipe';

export type SwipeActionTone = 'brand' | 'danger' | 'warning' | 'info';

export interface SwipeActionItem {
  label: string;
  icon?: React.ReactNode;
  tone?: SwipeActionTone;
  onTrigger?: () => void;
  disabled?: boolean;
}

export interface SwipeActionsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  children: React.ReactNode;
  left?: SwipeActionItem;
  right?: SwipeActionItem;
  disabled?: boolean;
  threshold?: number;
}

export { useSwipe } from '../useSwipe';

const toneClass: Record<SwipeActionTone, string> = {
  brand: 'bg-brand text-on-brand',
  danger: 'bg-danger text-on-brand',
  warning: 'bg-warning text-on-brand',
  info: 'bg-info text-on-brand',
};

/**
 * SwipeActions: A phone row gesture. It wraps any row and reveals what each side will do
 * while the finger moves; when the swipe passes the threshold it calls the handler
 * the page gave it and springs back. It never confirms, deletes or opens anything itself.
 *
 * Built from: useSwipe hook and Icon.
 */
export const SwipeActions = forwardRef<HTMLDivElement, SwipeActionsProps>(
  (
    {
      children,
      left,
      right,
      disabled = false,
      threshold = 96,
      className,
      ...props
    },
    ref,
  ) => {
    const canSwipeRight = Boolean(left && !left.disabled);
    const canSwipeLeft = Boolean(right && !right.disabled);

    const triggerLeft = () => {
      left?.onTrigger?.();
    };

    const triggerRight = () => {
      right?.onTrigger?.();
    };

    const { offset, isDragging, handlers } = useSwipe({
      threshold,
      disabled,
      canSwipeLeft,
      canSwipeRight,
      onSwipeRight: triggerLeft,
      onSwipeLeft: triggerRight,
    });

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      props.onPointerDown?.(e);
      handlers.onPointerDown(e);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      props.onPointerMove?.(e);
      handlers.onPointerMove(e);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      props.onPointerUp?.(e);
      handlers.onPointerUp(e);
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
      props.onPointerCancel?.(e);
      handlers.onPointerCancel(e);
    };

    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden touch-pan-y', className)}
        {...props}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Left Action background (revealed on swipe right) */}
        {left && (
          <div
            aria-hidden={offset <= 0}
            className={cn(
              'absolute inset-0 flex items-center justify-start gap-space-8 px-space-16 text-body-strong font-bold',
              toneClass[left.tone ?? 'brand'],
              offset <= 0 && 'pointer-events-none opacity-0',
            )}
          >
            {left.icon}
            <span>{left.label}</span>
          </div>
        )}

        {/* Right Action background (revealed on swipe left) */}
        {right && (
          <div
            aria-hidden={offset >= 0}
            className={cn(
              'absolute inset-0 flex items-center justify-end gap-space-8 px-space-16 text-body-strong font-bold',
              toneClass[right.tone ?? 'brand'],
              offset >= 0 && 'pointer-events-none opacity-0',
            )}
          >
            <span>{right.label}</span>
            {right.icon}
          </div>
        )}

        {/* Foreground Row */}
        <div
          style={{
            transform: `translateX(${offset}px)`,
          }}
          className={cn(
            'relative',
            !isDragging && 'transition-transform duration-base ease-out',
          )}
        >
          {children}
        </div>
      </div>
    );
  },
);

SwipeActions.displayName = 'SwipeActions';
