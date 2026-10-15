'use client';

import React, { forwardRef } from 'react';
import { toast as sonnerToast } from 'sonner';

import { BannerTone, bannerToneStyles } from '../Banner/Banner';
import { Button } from '../Button/Button';
import { cn } from '../cn';

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Toast tone (neutral, success, danger, warning, info). Default is neutral (dark ink). */
  tone?: BannerTone;
  /** Toast message */
  message?: React.ReactNode;
  /** Undo action callback */
  onUndo?: () => void;
  /** Label for undo action (default: 'Undo') */
  undoLabel?: string;
  /** Optional custom action element */
  action?: React.ReactNode;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      children,
      className,
      tone = 'neutral',
      message,
      onUndo,
      undoLabel = 'Undo',
      action,
      role,
      ...props
    },
    ref,
  ) => {
    const isDanger = tone === 'danger';
    const isNeutral = tone === 'neutral';

    return (
      <div
        ref={ref}
        role={role || (isDanger ? 'alert' : 'status')}
        className={cn(
          'shadow-pop rounded-ds-lg px-space-14 py-space-10 flex items-center gap-space-10 text-body font-semibold select-none',
          isNeutral ? 'bg-ink text-on-brand' : bannerToneStyles[tone],
          className,
        )}
        {...props}
      >
        <span className="flex-1 min-w-0">{message ?? children}</span>
        {onUndo ? (
          <Button
            type="button"
            variant="link"
            onClick={onUndo}
            className={cn(
              'ml-auto shrink-0',
              isNeutral ? 'text-line hover:text-line-soft' : 'text-inherit',
            )}
          >
            {undoLabel}
          </Button>
        ) : (
          action && <div className="ml-auto shrink-0">{action}</div>
        )}
      </div>
    );
  },
);

Toast.displayName = 'Toast';

export interface ShowToastOptions {
  tone?: BannerTone;
  onUndo?: () => void;
  undoLabel?: string;
  action?: React.ReactNode;
  duration?: number;
}

/**
 * Show a FinanceOS toast notification using sonner.
 * Auto-dismisses in ~5s, supports Undo.
 */
export function showToast(
  message: React.ReactNode,
  options?: ShowToastOptions,
) {
  return sonnerToast.custom(
    (id) => (
      <Toast
        message={message}
        tone={options?.tone}
        onUndo={
          options?.onUndo
            ? () => {
                options.onUndo?.();
                sonnerToast.dismiss(id);
              }
            : undefined
        }
        undoLabel={options?.undoLabel}
        action={options?.action}
      />
    ),
    {
      duration: options?.duration ?? 5000,
    },
  );
}

