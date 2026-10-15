'use client';

import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { useSwipe } from '../useSwipe';

export type SwipeActionsVariant = 'transactions' | 'inbox';
export type SwipeActionTone = 'brand' | 'danger' | 'warning' | 'info';

export interface SwipeActionItem {
  label: string;
  icon?: React.ReactNode;
  tone?: SwipeActionTone;
  onTrigger?: () => void;
  /** Backwards compatibility alias for onTrigger */
  onAction?: () => void;
  disabled?: boolean;
}

export interface SwipeActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  left?: SwipeActionItem;
  right?: SwipeActionItem;
  /** Backwards compatibility alias for left */
  leftAction?: SwipeActionItem;
  /** Backwards compatibility alias for right */
  rightAction?: SwipeActionItem;
  disabled?: boolean;
  threshold?: number;
}

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
      leftAction,
      rightAction,
      disabled = false,
      threshold = 96,
      className,
      ...props
    },
    ref,
  ) => {
    const effectiveLeft = left ?? leftAction;
    const effectiveRight = right ?? rightAction;

    const canSwipeRight = Boolean(effectiveLeft && !effectiveLeft.disabled);
    const canSwipeLeft = Boolean(effectiveRight && !effectiveRight.disabled);

    const triggerLeft = () => {
      effectiveLeft?.onTrigger?.();
      effectiveLeft?.onAction?.();
    };

    const triggerRight = () => {
      effectiveRight?.onTrigger?.();
      effectiveRight?.onAction?.();
    };

    const { offset, isDragging, handlers } = useSwipe({
      threshold,
      disabled,
      canSwipeLeft,
      canSwipeRight,
      onSwipeRight: triggerLeft,
      onSwipeLeft: triggerRight,
    });

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden select-none bg-surface border-t border-line-soft font-text',
          className,
        )}
        {...handlers}
        {...props}
      >
        {/* Left Action background (revealed on swipe right) */}
        {effectiveLeft && (
          <div
            aria-hidden={offset <= 0}
            className={cn(
              'absolute inset-0 flex items-center justify-start gap-space-8 px-space-16 text-body-strong font-bold',
              effectiveLeft.tone === 'danger' ? 'bg-danger text-on-brand' : 'bg-brand text-on-brand',
              offset <= 0 && 'pointer-events-none opacity-0',
            )}
          >
            {effectiveLeft.icon}
            <span>{effectiveLeft.label}</span>
          </div>
        )}

        {/* Right Action background (revealed on swipe left) */}
        {effectiveRight && (
          <div
            aria-hidden={offset >= 0}
            className={cn(
              'absolute inset-0 flex items-center justify-end gap-space-8 px-space-16 text-body-strong font-bold',
              effectiveRight.tone === 'brand' ? 'bg-brand text-on-brand' : 'bg-danger text-on-brand',
              offset >= 0 && 'pointer-events-none opacity-0',
            )}
          >
            <span>{effectiveRight.label}</span>
            {effectiveRight.icon}
          </div>
        )}

        {/* Foreground Row */}
        <div
          style={{
            transform: `translateX(${offset}px)`,
            transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative bg-surface touch-pan-y"
        >
          {children}
        </div>
      </div>
    );
  },
);

SwipeActions.displayName = 'SwipeActions';
