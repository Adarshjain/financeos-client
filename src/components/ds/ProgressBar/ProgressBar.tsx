import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type ProgressBarTone = 'brand' | 'warning' | 'danger';

export type ProgressBarSeries =
  | 'brand'
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'
  | 'chart-rest';

export interface ProgressBarSegment {
  value: number;
  label: string;
  color: ProgressBarSeries;
}

const seriesClass: Record<ProgressBarSeries, string> = {
  brand: 'bg-brand',
  'chart-1': 'bg-series-1',
  'chart-2': 'bg-series-2',
  'chart-3': 'bg-series-3',
  'chart-4': 'bg-series-4',
  'chart-5': 'bg-series-5',
  'chart-rest': 'bg-series-rest',
};

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Split form: flush segments, each as wide as its share of the sum. `value`, `tone`, `min` and `max` are ignored. */
  segments?: ProgressBarSegment[];
  value?: number;
  min?: number;
  max?: number;
  tone?: ProgressBarTone;
  label?: React.ReactNode;
}

const ProgressBarRoot = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      min = 0,
      max = 100,
      tone = 'brand',
      label,
      segments,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    if (segments) {
      const total = segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0);
      return (
        <div ref={ref} className={cn('w-full select-none', className)} {...props}>
          <div className="flex h-space-8 w-full overflow-hidden rounded-ds-pill bg-line-soft">
            {total > 0
              ? segments
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <div
                      key={s.label}
                      data-segment={s.label}
                      title={s.label}
                      className={cn('h-full', seriesClass[s.color])}
                      style={{ width: `${(s.value / total) * 100}%` }}
                    />
                  ))
              : null}
          </div>
          {label ? (
            <div className="mt-space-6 font-text text-caption text-ink-3">
              {label}
            </div>
          ) : null}
        </div>
      );
    }

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
              'h-full rounded-ds-pill',
              fillToneClass,
              isIndeterminate
                ? 'w-2/5 animate-sweep motion-reduce:animate-none'
                : 'transition-all duration-base',
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

ProgressBarRoot.displayName = 'ProgressBar';

export interface ProgressBarLegendItem {
  label: string;
  color: ProgressBarSeries;
}

export interface ProgressBarLegendProps
  extends React.HTMLAttributes<HTMLDivElement> {
  items: ProgressBarLegendItem[];
}

const ProgressBarLegend = forwardRef<HTMLDivElement, ProgressBarLegendProps>(
  ({ items, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-wrap gap-x-space-12 gap-y-space-4 font-text text-caption text-ink-3',
        className,
      )}
      {...props}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-space-4">
          <span
            data-swatch={item.label}
            className={cn(
              'h-space-8 w-space-8 shrink-0 rounded-ds-2xs',
              seriesClass[item.color],
            )}
          />
          {item.label}
        </span>
      ))}
    </div>
  ),
);

ProgressBarLegend.displayName = 'ProgressBar.Legend';

export const ProgressBar = Object.assign(ProgressBarRoot, {
  Legend: ProgressBarLegend,
});
