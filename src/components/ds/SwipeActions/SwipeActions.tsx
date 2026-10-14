import React, { forwardRef, useState } from 'react';

import { cn } from '../cn';

export interface SwipeActionItem {
  label: string;
  icon?: React.ReactNode;
  tone?: 'brand' | 'danger' | 'warning';
  onAction?: () => void;
  disabled?: boolean;
}

export interface SwipeActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  leftAction?: SwipeActionItem; // Revealed when swiping right (e.g. Approve, Snooze)
  rightAction?: SwipeActionItem; // Revealed when swiping left (e.g. Delete, Dismiss)
  revealed?: 'left' | 'right' | 'none';
  onRevealedChange?: (revealed: 'left' | 'right' | 'none') => void;
  borderTop?: boolean;
}

const ACTION_WIDTH = 96;

/**
 * SwipeActions: phone row gestures for list triage (Transactions, Inbox).
 * Swipe right reveals leftAction (Approve, Snooze - 96px, brand tone).
 * Swipe left reveals rightAction (Delete, Dismiss - 96px, danger tone).
 */
export const SwipeActions = forwardRef<HTMLDivElement, SwipeActionsProps>(
  (
    {
      children,
      leftAction,
      rightAction,
      revealed: controlledRevealed,
      onRevealedChange,
      borderTop = true,
      className,
      ...props
    },
    ref,
  ) => {
    const [internalRevealed, setInternalRevealed] = useState<
      'left' | 'right' | 'none'
    >('none');
    const [dragOffset, setDragOffset] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);

    const isControlled = controlledRevealed !== undefined;
    const currentRevealed = isControlled ? controlledRevealed : internalRevealed;

    const setRevealedState = (next: 'left' | 'right' | 'none') => {
      if (!isControlled) {
        setInternalRevealed(next);
      }
      onRevealedChange?.(next);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      // Don't intercept clicks inside interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea')) return;

      setIsDragging(true);
      setStartX(e.clientX);
      setDragOffset(
        currentRevealed === 'left'
          ? ACTION_WIDTH
          : currentRevealed === 'right'
            ? -ACTION_WIDTH
            : 0,
      );
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;

      const base =
        currentRevealed === 'left'
          ? ACTION_WIDTH
          : currentRevealed === 'right'
            ? -ACTION_WIDTH
            : 0;

      let nextOffset = base + deltaX;

      // Limit bounds according to available actions
      const maxRight = leftAction && !leftAction.disabled ? ACTION_WIDTH : 0;
      const maxLeft = rightAction && !rightAction.disabled ? -ACTION_WIDTH : 0;

      nextOffset = Math.max(maxLeft, Math.min(maxRight, nextOffset));
      setDragOffset(nextOffset);
    };

    const handlePointerUp = () => {
      if (!isDragging) return;
      setIsDragging(false);

      if (dragOffset === null) return;

      const threshold = ACTION_WIDTH / 2;
      if (dragOffset > threshold && leftAction && !leftAction.disabled) {
        setRevealedState('left');
      } else if (dragOffset < -threshold && rightAction && !rightAction.disabled) {
        setRevealedState('right');
      } else {
        setRevealedState('none');
      }
      setDragOffset(null);
    };

    // Calculate current translation offset
    const activeOffset =
      dragOffset !== null
        ? dragOffset
        : currentRevealed === 'left'
          ? ACTION_WIDTH
          : currentRevealed === 'right'
            ? -ACTION_WIDTH
            : 0;

    return (
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'relative overflow-hidden bg-surface select-none',
          borderTop && 'border-t border-line-soft',
          className,
        )}
        {...props}
      >
        {/* Left Action Panel (revealed on swipe right) */}
        {leftAction ? (
          <div
            style={{ width: ACTION_WIDTH }}
            className={cn(
              'absolute inset-y-0 left-0 flex flex-col items-center justify-center gap-space-4 font-extrabold text-label text-on-brand transition-opacity',
              leftAction.tone === 'danger'
                ? 'bg-danger'
                : leftAction.tone === 'warning'
                  ? 'bg-warning'
                  : 'bg-brand',
              activeOffset > 0 ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none',
            )}
          >
            <button
              type="button"
              disabled={leftAction.disabled}
              onClick={() => {
                leftAction.onAction?.();
                setRevealedState('none');
              }}
              className="w-full h-full flex flex-col items-center justify-center gap-space-4 bg-transparent border-0 text-on-brand cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {leftAction.icon ? (
                <span className="w-space-20 h-space-20 shrink-0 flex items-center justify-center">
                  {leftAction.icon}
                </span>
              ) : null}
              <span className="leading-none">{leftAction.label}</span>
            </button>
          </div>
        ) : null}

        {/* Right Action Panel (revealed on swipe left) */}
        {rightAction ? (
          <div
            style={{ width: ACTION_WIDTH }}
            className={cn(
              'absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-space-4 font-extrabold text-label text-on-brand transition-opacity',
              rightAction.tone === 'brand'
                ? 'bg-brand'
                : rightAction.tone === 'warning'
                  ? 'bg-warning'
                  : 'bg-danger',
              activeOffset < 0 ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none',
            )}
          >
            <button
              type="button"
              disabled={rightAction.disabled}
              onClick={() => {
                rightAction.onAction?.();
                setRevealedState('none');
              }}
              className="w-full h-full flex flex-col items-center justify-center gap-space-4 bg-transparent border-0 text-on-brand cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {rightAction.icon ? (
                <span className="w-space-20 h-space-20 shrink-0 flex items-center justify-center">
                  {rightAction.icon}
                </span>
              ) : null}
              <span className="leading-none">{rightAction.label}</span>
            </button>
          </div>
        ) : null}

        {/* Swipeable Row Content */}
        <div
          style={{
            transform: `translateX(${activeOffset}px)`,
            transition: isDragging ? 'none' : 'transform 200ms ease-out',
          }}
          className="relative z-20 bg-surface w-full"
        >
          {children}
        </div>
      </div>
    );
  },
);
SwipeActions.displayName = 'SwipeActions';
