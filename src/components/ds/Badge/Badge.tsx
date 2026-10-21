'use client';

import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeVariant = 'soft' | 'solid' | 'outline' | 'dashed' | 'dot';
export type BadgeShape = 'default' | 'rounded';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  shape?: BadgeShape;
  size?: BadgeSize;
  asChild?: boolean;
}

const colorStyles: Record<BadgeVariant, Record<BadgeTone, string>> = {
  soft: {
    neutral: 'bg-line-soft text-neutral-ink',
    success: 'bg-positive-tint text-positive-strong',
    warning: 'bg-warning-tint text-warning',
    danger: 'bg-danger-tint text-danger',
    info: 'bg-info-tint text-info',
  },
  solid: {
    neutral: 'bg-ink text-on-brand',
    success: 'bg-positive text-on-brand',
    warning: 'bg-warning text-on-brand',
    danger: 'bg-danger text-on-brand',
    info: 'bg-info text-on-brand',
  },
  outline: {
    neutral: 'border border-line bg-subtle text-ink-2',
    success: 'border border-positive bg-surface text-positive',
    warning: 'border border-warning-border bg-surface text-warning',
    danger: 'border border-danger-border bg-surface text-danger',
    info: 'border border-info bg-surface text-info',
  },
  dashed: {
    neutral: 'border border-dashed border-line-strong bg-surface text-ink-2',
    success: 'border border-dashed border-positive bg-surface text-positive',
    warning: 'border border-dashed border-warning-border bg-surface text-warning',
    danger: 'border border-dashed border-danger-border bg-surface text-danger',
    info: 'border border-dashed border-info bg-surface text-info',
  },
  dot: {
    neutral: 'bg-ink',
    success: 'bg-positive',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'h-space-16 min-w-space-16 px-space-6 text-micro',
  md: 'h-space-20 px-space-8 text-caption',
};

const shapeStyles: Record<BadgeShape, string> = {
  default: 'rounded-ds-sm',
  rounded: 'rounded-ds-pill',
};

export const Badge = forwardRef<HTMLButtonElement, BadgeProps>(
  (
    {
      children,
      className,
      tone = 'neutral',
      variant = 'soft',
      shape = 'default',
      size = 'md',
      asChild = false,
      onClick,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isInteractive = Boolean(onClick || asChild);
    const isDot = variant === 'dot';
    const isBold = variant === 'soft' || variant === 'solid';

    const classes = cn(
      'inline-flex items-center justify-center font-text leading-none select-none box-border shrink-0 whitespace-nowrap',
      isDot
        ? 'h-space-8 w-space-8 rounded-ds-pill'
        : [
            isBold ? 'font-bold' : 'font-semibold',
            sizeStyles[size],
            shapeStyles[shape],
          ],
      colorStyles[variant][tone],
      isInteractive && [
        'cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
        tone === 'warning'
          ? 'hover:bg-warning-tint active:bg-warning-tint'
          : 'hover:bg-hover active:bg-pressed',
      ],
      className,
    );

    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

    if (onClick) {
      return (
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          className={classes}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </button>
      );
    }

    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className={classes}
        {...(props as React.HTMLAttributes<HTMLSpanElement>)}
      >
        {isDot ? null : children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
