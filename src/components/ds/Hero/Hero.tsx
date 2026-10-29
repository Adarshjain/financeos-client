import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { concealMoney } from '../Conceal/concealMoney';
import { type Figure,Figures } from '../Figures/Figures';
import { Skeleton } from '../Skeleton/Skeleton';
import { Text, type TextTone } from '../Text/Text';

export type HeroFigure = Figure;

export interface HeroChange {
  text: React.ReactNode;
  tone?: TextTone;
}

export interface HeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Small label above the headline figure. Optional: the page title often says it. */
  label?: React.ReactNode;
  /** The headline figure. */
  value: React.ReactNode;
  /** Colours the headline figure: positive for a gain or receivable, danger for a loss or payable. */
  valueTone?: TextTone;
  /** The change line under the headline ("+₹1,240 today"). */
  change?: HeroChange;
  /** Up to three small figures under the headline, in a row (two across on a phone). */
  figures?: HeroFigure[];
  /** Under the figures, e.g. a ProgressBar. */
  children?: React.ReactNode;
}

const MAX_FIGURES = 3;

/**
 * Hero: the headline of a page. One big figure with an optional label above and change line below, up to three
 * small figures (label, figure, optional caption) and an optional slot under them (a ProgressBar).
 * Replaces the hand-built phone heroes and the desktop tile rows; Tiles stay for Upcoming, import results and KPI widgets.
 */
const HeroRoot = forwardRef<HTMLDivElement, HeroProps>(
  ({ label, value, valueTone, change, figures = [], children, className, ...props }, ref) => {
    const shown = figures.slice(0, MAX_FIGURES);
    return (
      <div ref={ref} className={cn('flex flex-col gap-space-8 desk:gap-space-12', className)} {...props}>
        <div className="flex flex-col gap-space-2">
          {label ? (
            <Text variant="label" tone="ink-3" as="div">
              {label}
            </Text>
          ) : null}
          <Text variant="hero-figure" family="display" tone={valueTone} as="div">
            {concealMoney(value)}
          </Text>
          {change ? (
            <Text variant="label" tone={change.tone} as="div">
              {concealMoney(change.text)}
            </Text>
          ) : null}
        </div>
        <Figures figures={shown} />
        {children}
      </div>
    );
  },
);

HeroRoot.displayName = 'Hero';

export interface HeroSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Match the loaded hero: a label above the headline. */
  label?: boolean;
  /** Match the loaded hero: a change line under the headline. */
  change?: boolean;
  /** How many small figures the loaded hero has (0 to 3). */
  figures?: number;
}

/** The Hero's loading state, with its exact layout: same gaps, figure grid and line heights. */
const HeroSkeleton = forwardRef<HTMLDivElement, HeroSkeletonProps>(
  ({ label = false, change = false, figures = 0, className, ...props }, ref) => {
    const count = Math.min(Math.max(figures, 0), MAX_FIGURES);
    return (
      <div ref={ref} aria-hidden="true" className={cn('flex flex-col gap-space-8 desk:gap-space-12', className)} {...props}>
        <div className="flex flex-col gap-space-2">
          {label ? <Skeleton width={80} height={16} /> : null}
          <Skeleton width={180} height={40} />
          {change ? <Skeleton width={110} height={16} /> : null}
        </div>
        <Figures.Skeleton count={count} />
      </div>
    );
  },
);

HeroSkeleton.displayName = 'Hero.Skeleton';

export const Hero = Object.assign(HeroRoot, { Skeleton: HeroSkeleton });
