import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { ProgressBar, ProgressBarTone } from '../ProgressBar/ProgressBar';
import { Skeleton } from '../Skeleton/Skeleton';

export type KpiTileVariant = 'default' | 'hero';
export type KpiDeltaDirection = 'good' | 'bad' | 'neutral';

export interface KpiDelta {
  /** Delta figure with arrow symbol, e.g. "▲ ₹41,220" or "▲ 28%" */
  value: React.ReactNode;
  /** Period or comparison text, e.g. "this month" or "vs Sep" */
  period?: React.ReactNode;
  /**
   * Sentiment direction:
   * - 'good': positive green (e.g. net worth up or spending down)
   * - 'bad': danger red (e.g. spending up or net worth down)
   * - 'neutral': ink-3 neutral
   */
  direction?: KpiDeltaDirection;
}

export interface KpiTileProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Label shown as uppercase overline, e.g. "Net worth", "Spent · October" */
  label?: React.ReactNode;
  /** Main KPI value, e.g. "₹11,98,842", "62%" */
  value?: React.ReactNode;
  /** Size variant: 'default' (figure size 22px) or 'hero' (headline size 30px) */
  variant?: KpiTileVariant;
  /** Delta information (change figure and comparison period) */
  delta?: KpiDelta | React.ReactNode;

  /** Optional progress bar context */
  progressBar?: {
    value: number;
    max?: number;
    tone?: ProgressBarTone;
  };
  /** Optional badges shown in context area */
  badges?: React.ReactNode;
  /** Optional secondary context / breakdown text, e.g. "of ₹1.55L · 18 days left" */
  context?: React.ReactNode;

  /** Whether the tile is in loading state */
  loading?: boolean;
  /** Error message or true for failed state */
  error?: React.ReactNode | boolean;
  /** Retry callback if failed */
  onRetry?: () => void;
}

export const KpiTile = forwardRef<HTMLDivElement, KpiTileProps>(
  (
    {
      label,
      value,
      variant = 'default',
      delta,
      progressBar,
      badges,
      context,
      loading = false,
      error,
      onRetry,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-surface border border-line rounded-ds-lg px-space-16 py-space-14 min-w-0 flex flex-col select-none',
            className,
          )}
          {...props}
        >
          <Skeleton width="40%" height={12} />
          <Skeleton width="70%" height={22} className="mt-space-10" />
          <Skeleton width="50%" height={14} className="mt-space-8" />
        </div>
      );
    }

    if (error) {
      return (
        <div
          ref={ref}
          role="alert"
          className={cn(
            'bg-surface border border-danger-border rounded-ds-lg px-space-16 py-space-14 min-w-0 flex flex-col select-none',
            className,
          )}
          {...props}
        >
          <div className="text-overline uppercase text-danger font-bold">
            {label}
          </div>
          <div className="mt-space-8 text-label font-medium text-ink-3">
            {typeof error === 'string' || React.isValidElement(error) ? (
              error
            ) : (
              <>
                Prices unavailable
                {onRetry && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={onRetry}
                      className="text-ink font-bold underline hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                    >
                      Retry
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    const isHero = variant === 'hero';

    const renderDelta = () => {
      if (!delta) return null;

      if (React.isValidElement(delta) || typeof delta === 'string') {
        return (
          <div className="mt-space-4 text-label font-bold flex items-center gap-space-4 flex-wrap">
            {delta}
          </div>
        );
      }

      const deltaObj = delta as KpiDelta;
      const isGood = deltaObj.direction === 'good';
      const isBad = deltaObj.direction === 'bad';

      return (
        <div className="mt-space-4 text-label font-bold flex items-center gap-space-4 flex-wrap">
          <span
            className={cn(
              isGood && 'text-positive',
              isBad && 'text-danger',
              !isGood && !isBad && 'text-ink-3',
            )}
          >
            {deltaObj.value}
          </span>
          {deltaObj.period && (
            <span className="font-medium text-ink-3">
              {deltaObj.period}
            </span>
          )}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface border border-line rounded-ds-lg px-space-16 py-space-14 min-w-0 flex flex-col select-none',
          className,
        )}
        {...props}
      >
        {label && (
          <div className="text-overline uppercase text-ink-4 font-bold">
            {label}
          </div>
        )}

        {(value !== undefined || children !== undefined) && (
          <div
            className={cn(
              'tabular-nums whitespace-nowrap text-ink mt-space-4',
              isHero
                ? 'font-display text-hero-figure font-extrabold'
                : 'font-text text-figure font-extrabold',
            )}
          >
            {value ?? children}
          </div>
        )}

        {renderDelta()}

        {progressBar && (
          <div className="mt-space-10">
            <ProgressBar
              value={progressBar.value}
              max={progressBar.max}
              tone={progressBar.tone}
              aria-label={typeof label === 'string' ? `${label} progress` : 'Progress'}
            />
          </div>
        )}

        {badges && (
          <div className="flex items-center gap-space-6 mt-space-8 flex-wrap">
            {badges}
          </div>
        )}

        {context && (
          <div className="mt-space-6 text-label font-medium text-ink-3">
            {context}
          </div>
        )}
      </div>
    );
  },
);

KpiTile.displayName = 'KpiTile';
