import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'danger-outline'
  | 'danger-filled'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'xl' | 'small' | 'default' | 'phone';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  loading?: boolean;
  loadingLabel?: React.ReactNode;
  count?: number | string;
  icon?: React.ReactNode;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-brand text-on-brand hover:bg-brand-strong active:bg-brand-strong',
  secondary:
    'border border-line-strong bg-surface text-ink hover:bg-hover active:bg-hover',
  danger:
    'border border-danger-border bg-surface text-danger hover:bg-danger-tint active:bg-danger-tint',
  'danger-outline':
    'border border-danger-border bg-surface text-danger hover:bg-danger-tint active:bg-danger-tint',
  'danger-filled':
    'border border-transparent bg-danger text-on-brand hover:opacity-90 active:opacity-90',
  ghost:
    'border border-transparent bg-transparent text-ink hover:bg-hover active:bg-hover',
};

function normalizeSize(size: ButtonSize): 'sm' | 'md' | 'xl' {
  if (size === 'small' || size === 'sm') return 'sm';
  if (size === 'phone' || size === 'xl') return 'xl';
  return 'md';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'secondary',
      size = 'md',
      iconOnly = false,
      loading = false,
      loadingLabel,
      count,
      icon,
      disabled,
      asChild = false,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const normalizedSize = normalizeSize(size);

    const sizeClasses = {
      sm: iconOnly
        ? 'h-control-sm aspect-square p-0 rounded-ds-sm'
        : 'h-control-sm px-space-8 text-caption rounded-ds-sm gap-space-4',
      md: iconOnly
        ? 'h-control-md aspect-square p-0 rounded-ds-md'
        : 'h-control-md px-space-12 text-label rounded-ds-md gap-space-6',
      xl: iconOnly
        ? 'h-control-xl aspect-square p-0 rounded-ds-lg'
        : 'h-control-xl px-space-16 text-heading rounded-ds-lg gap-space-8',
    }[normalizedSize];

    const spinnerSize = normalizedSize === 'sm' ? 'h-space-12 w-space-12' : 'h-space-14 w-space-14';

    const classes = cn(
      'inline-flex items-center justify-center font-text font-semibold whitespace-nowrap transition-colors duration-fast select-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
      'disabled:opacity-45 disabled:pointer-events-none cursor-pointer',
      sizeClasses,
      variantStyles[variant],
      className,
    );

    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

    const isEffectivelyDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={isEffectivelyDisabled}
        aria-busy={loading ? 'true' : undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className={cn('animate-spin shrink-0', spinnerSize)} aria-hidden="true" />
            {loadingLabel ? (
              <span>{loadingLabel}</span>
            ) : !iconOnly && children ? (
              <span>{children}</span>
            ) : null}
          </>
        ) : (
          <>
            {icon ? <span className="inline-flex items-center justify-center shrink-0">{icon}</span> : null}
            {children}
            {count !== undefined && count !== null ? (
              <span className="inline-flex items-center justify-center min-w-space-16 h-space-16 px-space-6 rounded-ds-pill bg-ink text-on-brand font-text font-bold text-tab-label leading-none shrink-0">
                {count}
              </span>
            ) : null}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
