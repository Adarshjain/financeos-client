import { Check, Eye, Trash2, X } from 'lucide-react';
import React, { forwardRef, useState } from 'react';

import { cn } from '../cn';

export type SwipeActionsVariant = 'transactions' | 'inbox';

export interface SwipeActionItem {
  label: string;
  icon?: React.ReactNode;
  tone?: 'brand' | 'danger';
  onAction?: () => void;
  disabled?: boolean;
}

export interface SwipeActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: SwipeActionsVariant;
  onApprove?: () => void;
  onDelete?: () => void;
  onSnooze?: () => void;
  onDismiss?: () => void;
  canApprove?: boolean; // On a row that needs no approval it does nothing and springs back
  revealed?: 'left' | 'right' | 'none';
  onRevealedChange?: (revealed: 'left' | 'right' | 'none') => void;
  leftAction?: SwipeActionItem;
  rightAction?: SwipeActionItem;
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
      variant = 'transactions',
      onApprove,
      onDelete,
      onSnooze,
      onDismiss,
      canApprove = true,
      revealed: controlledRevealed,
      onRevealedChange,
      leftAction,
      rightAction,
      className,
      ...props
    },
    ref,
  ) => {
    const [internalRevealed, setInternalRevealed] = useState<'left' | 'right' | 'none'>('none');
    const [dragOffset, setDragOffset] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);

    const isControlled = controlledRevealed !== undefined;
    const currentRevealed = isControlled ? controlledRevealed : internalRevealed;

    const setRevealedState = (next: 'left' | 'right' | 'none') => {
      if (!isControlled) {
        setInternalRevealed(next);
      }
      onRevealedChange?.(next);
    };

    const defaultLeftAction: SwipeActionItem =
      variant === 'inbox'
        ? {
            label: 'Snooze',
            icon: <Eye className="w-space-20 h-space-20" />,
            tone: 'brand',
            onAction: onSnooze,
          }
        : {
            label: 'Approve',
            icon: <Check className="w-space-20 h-space-20" />,
            tone: 'brand',
            onAction: onApprove,
            disabled: !canApprove,
          };

    const defaultRightAction: SwipeActionItem =
      variant === 'inbox'
        ? {
            label: 'Dismiss',
            icon: <X className="w-space-20 h-space-20" />,
            tone: 'danger',
            onAction: onDismiss,
          }
        : {
            label: 'Delete',
            icon: <Trash2 className="w-space-20 h-space-20" />,
            tone: 'danger',
            onAction: onDelete,
          };

    const effectiveLeftAction = leftAction ?? defaultLeftAction;
    const effectiveRightAction = rightAction ?? defaultRightAction;

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea')) return;

      setIsDragging(true);
      setIsScrolling(false);
      setStartX(e.clientX);
      setStartY(e.clientY);
      setDragOffset(
        currentRevealed === 'left'
          ? ACTION_WIDTH
          : currentRevealed === 'right'
            ? -ACTION_WIDTH
            : 0,
      );
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || isScrolling) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Prevent dragging if user is scrolling vertically
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        setIsScrolling(true);
        setDragOffset(null);
        return;
      }

      if (Math.abs(deltaX) > 5 && typeof e.currentTarget?.setPointerCapture === 'function') {
        try {
          if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        } catch {
          // Ignore if pointer capture fails
        }
      }

      const base =
        currentRevealed === 'left'
          ? ACTION_WIDTH
          : currentRevealed === 'right'
            ? -ACTION_WIDTH
            : 0;

      let nextOffset = base + deltaX;

      const maxRight = effectiveLeftAction && !effectiveLeftAction.disabled ? ACTION_WIDTH : 0;
      const maxLeft = effectiveRightAction && !effectiveRightAction.disabled ? -ACTION_WIDTH : 0;

      if (nextOffset > maxRight) {
        nextOffset = maxRight;
      }
      if (nextOffset < maxLeft) {
        nextOffset = maxLeft;
      }

      setDragOffset(nextOffset);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (typeof e.currentTarget?.releasePointerCapture === 'function') {
        try {
          if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignore
        }
      }

      if (!isDragging) return;
      setIsDragging(false);
      setIsScrolling(false);

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5 && currentRevealed !== 'none') {
        setRevealedState('none');
        setDragOffset(null);
        return;
      }

      if (dragOffset === null) return;

      const threshold = ACTION_WIDTH / 2;
      if (dragOffset > threshold && effectiveLeftAction && !effectiveLeftAction.disabled) {
        setRevealedState('left');
      } else if (dragOffset < -threshold && effectiveRightAction && !effectiveRightAction.disabled) {
        setRevealedState('right');
      } else {
        setRevealedState('none');
      }
      setDragOffset(null);
    };

    const leftWidth =
      dragOffset !== null
        ? dragOffset > 0
          ? Math.min(ACTION_WIDTH, dragOffset)
          : 0
        : currentRevealed === 'left'
          ? ACTION_WIDTH
          : 0;

    const rightWidth =
      dragOffset !== null
        ? dragOffset < 0
          ? Math.min(ACTION_WIDTH, -dragOffset)
          : 0
        : currentRevealed === 'right'
          ? ACTION_WIDTH
          : 0;

    return (
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'flex overflow-hidden bg-surface select-none touch-pan-y border-t border-line-soft',
          className,
        )}
        {...props}
      >
        {/* Left Action (revealed on swipe right) */}
        {effectiveLeftAction ? (
          <div
            aria-hidden={leftWidth <= 0}
            style={{
              width: `${leftWidth}px`,
              transition: isDragging ? 'none' : 'width 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={cn(
              'shrink-0 overflow-hidden flex items-stretch',
              effectiveLeftAction.tone === 'danger' ? 'bg-danger' : 'bg-brand',
              leftWidth <= 0 && 'pointer-events-none',
            )}
          >
            <button
              type="button"
              tabIndex={leftWidth >= ACTION_WIDTH ? 0 : -1}
              disabled={effectiveLeftAction.disabled}
              onClick={() => {
                effectiveLeftAction.onAction?.();
                setRevealedState('none');
              }}
              className="w-swipe-action h-full flex flex-col items-center justify-center gap-space-4 bg-transparent border-0 font-extrabold text-label text-on-brand cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {effectiveLeftAction.icon ? (
                <span
                  className="w-space-20 h-space-20 shrink-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  {effectiveLeftAction.icon}
                </span>
              ) : null}
              <span className="leading-none">{effectiveLeftAction.label}</span>
            </button>
          </div>
        ) : null}

        {/* Swipeable Row Content */}
        <div className="flex-1 min-w-0 bg-surface">
          {children}
        </div>

        {/* Right Action (revealed on swipe left) */}
        {effectiveRightAction ? (
          <div
            aria-hidden={rightWidth <= 0}
            style={{
              width: `${rightWidth}px`,
              transition: isDragging ? 'none' : 'width 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={cn(
              'shrink-0 overflow-hidden flex items-stretch',
              effectiveRightAction.tone === 'brand' ? 'bg-brand' : 'bg-danger',
              rightWidth <= 0 && 'pointer-events-none',
            )}
          >
            <button
              type="button"
              tabIndex={rightWidth >= ACTION_WIDTH ? 0 : -1}
              disabled={effectiveRightAction.disabled}
              onClick={() => {
                effectiveRightAction.onAction?.();
                setRevealedState('none');
              }}
              className="w-swipe-action h-full flex flex-col items-center justify-center gap-space-4 bg-transparent border-0 font-extrabold text-label text-on-brand cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {effectiveRightAction.icon ? (
                <span
                  className="w-space-20 h-space-20 shrink-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  {effectiveRightAction.icon}
                </span>
              ) : null}
              <span className="leading-none">{effectiveRightAction.label}</span>
            </button>
          </div>
        ) : null}
      </div>
    );
  },
);
SwipeActions.displayName = 'SwipeActions';
