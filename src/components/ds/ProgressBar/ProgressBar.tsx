import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type ProgressBarTone = 'brand' | 'warning' | 'danger';

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  min?: number;
  max?: number;
  tone?: ProgressBarTone;
  label?: React.ReactNode;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      min = 0,
      max = 100,
      tone = 'brand',
      label,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const isIndeterminate = value === undefined;
    const range = max - min;
    const fillPercent =
      !isIndeterminate && range > 0
        ? Math.min(Math.max(((value - min) / range) * 100, 0), 100)
        : 0;

    const fillToneClass = {
      brand: 'bg-brand',
      warning: 'bg-warning',
      danger: 'bg-danger',
    }[tone] ?? 'bg-brand';

    return (
      <div ref={ref} className={cn('w-full select-none', className)} {...props}>
        <div
          role="progressbar"
          aria-valuenow={isIndeterminate ? undefined : value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={ariaLabel}
          aria-valuetext={typeof label === 'string' ? label : undefined}
          className="h-space-6 w-full rounded-ds-pill bg-line-soft overflow-hidden"
        >
          <div
            className={cn(
              'h-full rounded-ds-pill transition-all duration-base',
              fillToneClass,
              isIndeterminate && 'w-full animate-pulse motion-reduce:animate-none',
            )}
            style={isIndeterminate ? undefined : { width: `${fillPercent}%` }}
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
