'use client';

import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'danger-filled'
  | 'ghost'
  | 'google';

export type ButtonSize = 'sm' | 'md' | 'xl';

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
  'danger-filled':
    'border border-transparent bg-danger text-on-brand hover:opacity-90 active:opacity-90',
  ghost:
    'border border-transparent bg-transparent text-ink hover:bg-hover active:bg-hover',
  google:
    'border border-line-strong bg-surface text-ink hover:bg-hover active:bg-hover w-full',
};

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
    const isGoogle = variant === 'google';
    const effectiveSize = isGoogle ? 'xl' : size;

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
    }[effectiveSize];

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
    const isPrimary = variant === 'primary';

    const effectiveIcon =
      icon ??
      (isGoogle ? (
        <img
          src="/brand/google-g.svg"
          width={18}
          height={18}
          alt=""
          aria-hidden="true"
          className="shrink-0"
        />
      ) : null);

    const effectiveChildren =
      children ?? (isGoogle ? 'Continue with Google' : null);

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
            <Icon
              name="settings"
              size={effectiveSize === 'sm' ? 'sm' : 'md'}
              className="animate-spin shrink-0"
            />
            {loadingLabel ? (
              <span>{loadingLabel}</span>
            ) : !iconOnly && effectiveChildren ? (
              <span>{effectiveChildren}</span>
            ) : null}
          </>
        ) : (
          <>
            {effectiveIcon ? (
              <span className="inline-flex items-center justify-center shrink-0">
                {effectiveIcon}
              </span>
            ) : null}
            {effectiveChildren}
            {count !== undefined && count !== null ? (
              <Badge
                variant="count"
                count={count}
                className={isPrimary ? 'bg-surface text-ink' : undefined}
              />
            ) : null}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
