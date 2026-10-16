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
  | 'google'
  | 'link'
  | 'tile';

export type ButtonIconPosition = 'start' | 'top';

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
  iconPosition?: ButtonIconPosition;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-pressed',
  secondary:
    'border border-line-strong bg-surface text-ink hover:bg-hover active:bg-pressed',
  danger:
    'border border-danger-border bg-surface text-danger hover:bg-danger-tint active:bg-danger-tint active:border-danger',
  'danger-filled':
    'border border-transparent bg-danger text-on-brand hover:bg-danger-hover active:bg-danger-pressed',
  ghost:
    'border border-transparent bg-transparent text-ink hover:bg-hover active:bg-pressed',
  google:
    'border border-line-strong bg-surface text-ink hover:bg-hover active:bg-pressed w-full',
  link:
    'border-0 bg-transparent text-inherit underline underline-offset-2 hover:no-underline active:opacity-80 p-0 h-auto font-bold inline',
  tile:
    'border border-line bg-surface hover:bg-hover active:bg-pressed w-full no-underline [&_svg]:text-ink-3 [&_svg]:shrink-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'secondary',
      size = 'md',
      iconPosition = 'start',
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
    const isLink = variant === 'link';
    const isGoogle = variant === 'google';
    const isTile = variant === 'tile';
    const effectiveSize = isGoogle ? 'xl' : size;

    const sizeClasses = isLink
      ? ''
      : isTile
        ? iconPosition === 'top'
          ? 'h-16 px-space-4 py-space-12 gap-space-6 rounded-ds-lg text-label text-ink-2 flex-col items-center justify-center text-center'
          : 'px-space-12 py-space-12 gap-space-12 rounded-ds-lg text-body-strong text-ink justify-start text-left'
        : {
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
      isLink
        ? 'inline font-text font-bold text-inherit underline underline-offset-2 transition-colors duration-fast select-none cursor-pointer disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2'
        : cn(
            'inline-flex items-center justify-center font-text whitespace-nowrap transition-colors duration-fast select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:opacity-45 disabled:pointer-events-none cursor-pointer',
            isTile
              ? iconPosition === 'top'
                ? 'font-semibold'
                : 'font-bold'
              : 'font-semibold',
          ),
      sizeClasses,
      variantStyles[variant],
      className,
    );

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

    if (asChild) {
      if (React.isValidElement(children) && effectiveIcon) {
        const child = children as React.ReactElement<{ children?: React.ReactNode }>;
        return (
          <Slot ref={ref} className={classes} {...props}>
            {React.cloneElement(
              child,
              {},
              <span className={cn('inline-flex items-center justify-center shrink-0', isTile && 'text-ink-3')}>
                {effectiveIcon}
              </span>,
              child.props.children,
            )}
          </Slot>
        );
      }

      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

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
              name="spinner"
              data-testid="spinner-icon"
              size={isTile ? 'lg' : effectiveSize === 'sm' ? 'sm' : 'md'}
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
              <span className={cn('inline-flex items-center justify-center shrink-0', isTile && 'text-ink-3')}>
                {effectiveIcon}
              </span>
            ) : null}
            {effectiveChildren}
            {!isTile && count !== undefined && count !== null ? (
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
