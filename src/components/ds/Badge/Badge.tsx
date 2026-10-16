import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type BadgeTone = 'green' | 'amber' | 'rose' | 'blue' | 'grey';
export type BadgeCountTone = 'ink' | 'danger' | 'warning';
export type BadgeVariant = 'count' | 'default';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  tone?: BadgeTone | BadgeCountTone;
  count?: number | string;
}

const toneStyles: Record<BadgeTone, string> = {
  green: 'bg-positive-tint text-positive-strong',
  amber: 'bg-warning-tint text-warning',
  rose: 'bg-danger-tint text-danger',
  blue: 'bg-info-tint text-info',
  grey: 'bg-line-soft text-neutral-ink',
};

const countToneStyles: Record<BadgeCountTone, string> = {
  ink: 'bg-ink text-on-brand',
  danger: 'bg-danger text-on-brand',
  warning: 'bg-warning text-on-brand',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, className, tone, variant = 'grey', count, ...props }, ref) => {
    const isCount = variant === 'count' || count !== undefined;

    if (isCount) {
      const countTone = (tone as BadgeCountTone) || 'ink';
      let displayCount: React.ReactNode = count ?? children;

      if (typeof displayCount === 'number') {
        if (displayCount > 99) {
          displayCount = '99+';
        }
      } else if (typeof displayCount === 'string') {
        const parsed = parseInt(displayCount, 10);
        if (!isNaN(parsed) && parsed > 99 && !displayCount.includes('+')) {
          displayCount = '99+';
        }
      }

      return (
        <span
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center h-space-16 min-w-space-16 px-space-6 rounded-ds-pill',
            'font-text font-bold text-micro leading-none whitespace-nowrap select-none box-border shrink-0',
            countToneStyles[countTone] || countToneStyles.ink,
            className,
          )}
          {...props}
        >
          {displayCount}
        </span>
      );
    }

    const selectedTone: BadgeTone = (tone as BadgeTone) || 'grey';

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center h-space-20 px-space-8 rounded-ds-sm',
          'font-text font-bold text-caption whitespace-nowrap select-none',
          toneStyles[selectedTone] || toneStyles.grey,
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
