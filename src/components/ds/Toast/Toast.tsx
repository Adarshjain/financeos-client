import React, { forwardRef } from 'react';
import { toast as sonnerToast } from 'sonner';

import { cn } from '../cn';

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Toast message */
  message?: React.ReactNode;
  /** Undo action callback */
  onUndo?: () => void;
  /** Label for undo action (default: 'Undo') */
  undoLabel?: string;
  /** Optional custom action element */
  action?: React.ReactNode;
  /** Whether this toast represents a failure */
  isError?: boolean;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      children,
      className,
      message,
      onUndo,
      undoLabel = 'Undo',
      action,
      isError = false,
      role,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        role={role || (isError ? 'alert' : 'status')}
        className={cn(
          'bg-ink text-on-brand shadow-pop rounded-ds-lg px-space-14 py-space-10 flex items-center gap-space-10 text-body font-semibold select-none',
          className,
        )}
        {...props}
      >
        <span className="flex-1 min-w-0">{message ?? children}</span>
        {onUndo ? (
          <button
            type="button"
            onClick={onUndo}
            className="ml-auto text-line underline font-bold hover:text-line-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring rounded-ds-sm shrink-0 transition-colors"
          >
            {undoLabel}
          </button>
        ) : (
          action && <div className="ml-auto shrink-0">{action}</div>
        )}
      </div>
    );
  },
);

Toast.displayName = 'Toast';

export interface ShowToastOptions {
  onUndo?: () => void;
  undoLabel?: string;
  action?: React.ReactNode;
  isError?: boolean;
  duration?: number;
}

/**
 * Show a FinanceOS toast notification using sonner.
 * Auto-dismisses in ~5s, supports Undo.
 */
export function showToast(message: React.ReactNode, options?: ShowToastOptions) {
  return sonnerToast.custom(
    (id) => (
      <Toast
        message={message}
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
        isError={options?.isError}
      />
    ),
    {
      duration: options?.duration ?? 5000,
    },
  );
}
