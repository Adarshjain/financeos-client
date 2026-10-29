'use client';

import React, { forwardRef } from 'react';

import { ActionButton, type ActionTarget } from '../Button/ActionButton';
import { Card } from '../Card/Card';
import { cn } from '../cn';
import { concealMoney } from '../Conceal/concealMoney';
import { ProgressBar, ProgressBarTone } from '../ProgressBar/ProgressBar';
import { Skeleton } from '../Skeleton/Skeleton';

export type KpiTileVariant = 'default' | 'hero' | 'plain';
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

export type KpiTileAction = { label: string } & ActionTarget;

export interface KpiTileProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** Label shown as uppercase overline, e.g. "Net worth", "Spent · October" */
  label?: React.ReactNode;
  /** Main KPI value, e.g. "₹11,98,842", "62%" */
  value?: React.ReactNode;
  /** 'default' (figure size 22px), 'hero' (headline size 30px) or 'plain' (the default's content with no card surface, border or padding, for a tile that already sits inside a card) */
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
  /** Error message or node when failed */
  error?: React.ReactNode;
  /** Action callback when failed, e.g. { label: 'Retry', onSelect: fn() } */
  action?: KpiTileAction;
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
      action,
      className,
      ...props
    },
    ref,
  ) => {
    const isHero = variant === 'hero';

    const renderDelta = () => {
      if (!delta) return null;

      if (React.isValidElement(delta) || typeof delta === 'string') {
        return (
          <div className="mt-space-4 text-label font-bold flex items-center gap-space-4 flex-wrap">
            {concealMoney(delta)}
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
            {concealMoney(deltaObj.value)}
          </span>
          {deltaObj.period && (
            <span className="font-medium text-ink-3">
              {deltaObj.period}
            </span>
          )}
        </div>
      );
    };

    let body: React.ReactNode = null;

    if (loading) {
      body = (
        <>
          <Skeleton width="40%" height={12} />
          <Skeleton width="70%" height={22} className="mt-space-8 desk:mt-space-10" />
          <Skeleton width="50%" height={14} className="mt-space-8" />
        </>
      );
    } else if (error) {
      body = (
        <>
          <div className="text-overline uppercase text-danger font-bold">
            {label}
          </div>
          <div className="mt-space-8 text-label font-medium text-ink-3">
            {error}
            {action && (
              <>
                {' · '}
                <ActionButton
                  variant="ghost"
                  size="sm"
                  href={action.href}
                  onSelect={action.onSelect}
                  className="inline-flex h-auto p-0 text-ink font-bold underline hover:text-ink-2 hover:bg-transparent"
                >
                  {action.label}
                </ActionButton>
              </>
            )}
          </div>
        </>
      );
    } else {
      body = (
        <>
          {label && (
            <div className="text-overline uppercase text-ink-4 font-bold">
              {label}
            </div>
          )}

          {value !== undefined && (
            <div
              className={cn(
                'tabular-nums whitespace-nowrap text-ink mt-space-4',
                isHero
                  ? 'font-display text-hero-figure font-extrabold'
                  : 'font-text text-figure font-extrabold',
              )}
            >
              {concealMoney(value)}
            </div>
          )}

          {renderDelta()}

          {progressBar && (
            <div className="mt-space-8 desk:mt-space-10">
              <ProgressBar
                value={progressBar.value}
                max={progressBar.max}
                tone={progressBar.tone}
                aria-label={
                  typeof label === 'string' ? `${label} progress` : 'Progress'
                }
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
              {concealMoney(context)}
            </div>
          )}
        </>
      );
    }

    if (variant === 'plain') {
      return (
        <div
          ref={ref}
          role={error ? 'alert' : undefined}
          className={cn('min-w-0 flex flex-col select-none', className)}
          {...props}
        >
          {body}
        </div>
      );
    }

    return (
      <Card
        ref={ref}
        role={error ? 'alert' : undefined}
        className={cn(
          error ? 'border-danger-border' : undefined,
          className,
        )}
        {...props}
      >
        <div className="px-space-16 py-space-14 min-w-0 flex flex-col select-none">
          {body}
        </div>
      </Card>
    );
  },
);

KpiTile.displayName = 'KpiTile';
