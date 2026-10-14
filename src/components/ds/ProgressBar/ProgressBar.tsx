import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type ProgressBarTone = 'auto' | 'brand' | 'warning' | 'danger';

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: ProgressBarTone;
  label?: React.ReactNode;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      tone = 'auto',
      label,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const rawPercentage = max > 0 ? (value / max) * 100 : 0;
    const fillPercent = Math.min(Math.max(rawPercentage, 0), 100);

    const resolvedTone: 'brand' | 'warning' | 'danger' = (() => {
      if (tone !== 'auto') return tone;
      if (rawPercentage > 100) return 'danger';
      if (rawPercentage >= 60) return 'warning';
      return 'brand';
    })();

    const fillToneClass = {
      brand: 'bg-brand',
      warning: 'bg-warning',
      danger: 'bg-danger',
    }[resolvedTone];

    return (
      <div ref={ref} className={cn('w-full select-none', className)} {...props}>
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={ariaLabel}
          aria-valuetext={typeof label === 'string' ? label : undefined}
          className="h-space-6 w-full rounded-ds-pill bg-line-soft overflow-hidden"
        >
          <div
            className={cn(
              'h-full rounded-ds-pill transition-all duration-base',
              fillToneClass,
            )}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        {label ? (
          <div className="mt-space-6 font-text text-caption text-ink-3">
            {label}
          </div>
        ) : null}
      </div>
    );
  },
);

ProgressBar.displayName = 'ProgressBar';
