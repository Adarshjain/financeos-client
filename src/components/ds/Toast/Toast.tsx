'use client';

import React, { forwardRef, useEffect } from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster, type ToasterProps as SonnerToasterProps } from 'sonner';

import { markDineroToaster } from '@/lib/toastTarget';

import { type BannerTone,bannerToneStyles } from '../Banner/toneStyles';
import { ActionButton, type ActionTarget } from '../Button/ActionButton';
import { cn } from '../cn';
import { concealText, useConcealedAnywhere } from '../Conceal/Conceal';

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'action'> {
  /** Toast tone (neutral, success, danger, warning, info). Default is neutral (dark ink). */
  tone?: BannerTone;
  /** Toast message */
  message?: React.ReactNode;
  /** Single action button on the right: action={{ label, onSelect }}, or { label, href } for a link */
  action?: { label: string } & ActionTarget;
  /** Optional second button, left of `action`, for a toast that offers two next steps (Copy ID and Debug). Only with `action`. */
  secondaryAction?: { label: string } & ActionTarget;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      children,
      className,
      tone = 'neutral',
      message,
      action,
      secondaryAction,
      role,
      ...props
    },
    ref,
  ) => {
    // The Toaster sits above the ConcealProvider, so the flag comes from the shared store.
    const concealed = useConcealedAnywhere();
    const shown = message ?? children;
    const isDanger = tone === 'danger';
    const isNeutral = tone === 'neutral';

    return (
      <div
        ref={ref}
        role={role || (isDanger ? 'alert' : 'status')}
        className={cn(
          'shadow-level-2 rounded-ds-lg px-space-14 py-space-10 flex items-center gap-space-10 font-text text-body font-semibold select-none',
          isNeutral ? 'bg-ink text-on-brand' : bannerToneStyles[tone],
          className,
        )}
        {...props}
      >
        <span className="flex-1 min-w-0">{concealed && typeof shown === 'string' ? concealText(shown) : shown}</span>
        {action && (
          <div className="ml-auto shrink-0 flex items-center gap-space-14">
            {[secondaryAction, action].map((a, i) =>
              a ? (
                <ActionButton
                  key={i}
                  variant="link"
                  href={a.href}
                  onSelect={a.onSelect}
                  loading={a.loading}
                  className={cn('shrink-0', isNeutral ? 'text-line hover:text-line-soft' : 'text-inherit')}
                >
                  {a.label}
                </ActionButton>
              ) : null,
            )}
          </div>
        )}
      </div>
    );
  },
);

Toast.displayName = 'Toast';

export interface ToasterProps extends Partial<SonnerToasterProps> {}

const DEFAULT_POSITION = ('bottom' + '-center') as NonNullable<SonnerToasterProps['position']>;

/**
 * The mount point for new-system toasts: bottom centre, above the TabBar on phone,
 * above a docked SelectionBar on desktop (`--ds-docked-bottom`, set in ds.css while one is mounted),
 * a single toast at a time, isolated from the root app toaster via id="ds".
 */
export function Toaster({
  id = 'ds',
  position = DEFAULT_POSITION,
  visibleToasts = 1,
  offset,
  mobileOffset,
  ...props
}: ToasterProps) {
  useEffect(() => markDineroToaster(), []);
  return (
    <SonnerToaster
      id={id}
      // A modal dialog sets pointer-events: none on the page; a toast with Undo must stay pressable over it.
      style={{ pointerEvents: 'auto' }}
      position={position}
      visibleToasts={visibleToasts}
      offset={offset ?? { bottom: 'calc(var(--ds-space-24) + var(--ds-docked-bottom, 0px))' }}
      mobileOffset={
        mobileOffset ?? {
          bottom: 'calc(var(--ds-space-12) + var(--ds-space-64) + env(safe-area-inset-bottom, 0px))',
        }
      }
      {...props}
    />
  );
}

export interface ShowToastOptions {
  id?: string;
  tone?: BannerTone;
  action?: { label: string } & ActionTarget;
  /** Second button left of `action` (see Toast `secondaryAction`); needs `action`. */
  secondaryAction?: { label: string } & ActionTarget;
  duration?: number;
  onDismiss?: () => void;
}

/**
 * Show a toast notification using sonner.
 * Targets the new-system Toaster (id="ds") at bottom-centre.
 * Auto-dismisses in ~5s, supports action (e.g. { label: 'Undo', onSelect }).
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
        action={
          options?.action
            ? {
                label: options.action.label,
                href: options.action.href,
                onSelect: () => {
                  options.action?.onSelect?.();
                  sonnerToast.dismiss(id);
                },
              }
            : undefined
        }
        secondaryAction={
          options?.action && options.secondaryAction
            ? {
                label: options.secondaryAction.label,
                href: options.secondaryAction.href,
                onSelect: () => {
                  options.secondaryAction?.onSelect?.();
                  sonnerToast.dismiss(id);
                },
              }
            : undefined
        }
      />
    ),
    {
      id: options?.id,
      toasterId: 'ds',
      duration: options?.duration ?? 5000,
      onDismiss: options?.onDismiss ? () => options.onDismiss!() : undefined,
    },
  );
}

/** Closes a toast that `showToast` opened (with its `id`, or the id it returned): a stale Undo must not outlive a newer change. */
export function dismissToast(id: string | number) {
  sonnerToast.dismiss(id);
}
