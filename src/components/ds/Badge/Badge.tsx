import React, { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export type BadgeTone = 'green' | 'amber' | 'rose' | 'blue' | 'grey';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeTone;
}

const toneStyles: Record<BadgeTone, string> = {
  green: 'bg-positive-tint text-positive-strong',
  amber: 'bg-warning-tint text-warning',
  rose: 'bg-danger-tint text-danger',
  blue: 'bg-info-tint text-info',
  grey: 'bg-line-soft text-neutral-ink',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, className, tone, variant = 'grey', ...props }, ref) => {
    const selectedTone = tone ?? variant;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center h-space-20 px-space-8 rounded-ds-sm',
          'font-text font-bold text-caption whitespace-nowrap select-none',
          toneStyles[selectedTone],
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
