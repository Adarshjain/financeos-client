import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export type CategoryChipVariant = 'default' | 'count' | 'unset';

export interface CategoryChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLSpanElement> {
  variant?: CategoryChipVariant;
  count?: number;
  asChild?: boolean;
}

const variantStyles: Record<CategoryChipVariant, { base: string; interactive: string }> = {
  default: {
    base: 'border border-line bg-subtle text-ink-2',
    interactive: 'hover:bg-hover active:bg-hover cursor-pointer',
  },
  count: {
    base: 'border border-line bg-surface text-ink-3',
    interactive: 'hover:bg-hover active:bg-hover cursor-pointer',
  },
  unset: {
    base: 'border border-dashed border-warning-border bg-surface text-warning',
    interactive: 'hover:bg-warning-tint active:bg-warning-tint cursor-pointer',
  },
};

export const CategoryChip = forwardRef<HTMLButtonElement, CategoryChipProps>(
  (
    {
      children,
      className,
      variant: explicitVariant,
      count,
      asChild = false,
      onClick,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const variant: CategoryChipVariant =
      explicitVariant ?? (count !== undefined ? 'count' : 'default');

    const isInteractive = Boolean(onClick || asChild);
    const styles = variantStyles[variant];

    const content = (() => {
      if (children !== undefined && children !== null) {
        return children;
      }
      if (variant === 'count' && count !== undefined) {
        return `+${count}`;
      }
      if (variant === 'unset') {
        return 'Set category';
      }
      return null;
    })();

    const classes = cn(
      'inline-flex items-center justify-center h-space-20 px-space-8 rounded-ds-pill',
      'font-text font-semibold text-caption leading-none whitespace-nowrap select-none transition-colors duration-fast',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
      styles.base,
      isInteractive && styles.interactive,
      className,
    );

    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {content}
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
          {content}
        </button>
      );
    }

    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className={classes}
        {...(props as React.HTMLAttributes<HTMLSpanElement>)}
      >
        {content}
      </span>
    );
  },
);

CategoryChip.displayName = 'CategoryChip';
