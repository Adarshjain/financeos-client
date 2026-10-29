import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { concealMoney } from '../Conceal/concealMoney';
import { Skeleton } from '../Skeleton/Skeleton';
import { Text, type TextTone } from '../Text/Text';

export interface Figure {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Colours the figure: positive for a gain or receivable, danger for a loss or payable. */
  tone?: TextTone;
  /** A small line under the figure. */
  caption?: React.ReactNode;
}

export interface FiguresProps extends React.HTMLAttributes<HTMLDivElement> {
  figures: Figure[];
  /** How many figures sit across from desk up: 3 (default) or 4. Always two across on a phone. */
  columns?: 3 | 4;
  /** `md` (default) is the Hero's look; `sm` steps the figure text down and tightens the gaps, for a card. */
  size?: 'sm' | 'md';
}

const COLUMNS: Record<'sm' | 'md', Record<3 | 4, string>> = {
  md: {
    3: 'grid grid-cols-2 desk:grid-cols-3 gap-x-space-16 gap-y-space-8',
    4: 'grid grid-cols-2 desk:grid-cols-4 gap-x-space-16 gap-y-space-8',
  },
  sm: {
    3: 'grid grid-cols-2 desk:grid-cols-3 gap-x-space-12 gap-y-space-6',
    4: 'grid grid-cols-2 desk:grid-cols-4 gap-x-space-12 gap-y-space-6',
  },
};

/**
 * Figures: a grid of small figures, each a label over a strong figure with an optional tone and caption.
 * Equal columns, no dividers. The Hero draws its small figures with it; use it alone to present a set of numbers.
 */
const FiguresRoot = forwardRef<HTMLDivElement, FiguresProps>(({ figures, columns = 3, size = 'md', className, ...props }, ref) => {
  if (figures.length === 0) return null;
  return (
    <div ref={ref} className={cn(COLUMNS[size][columns], className)} {...props}>
      {figures.map((f, i) => (
        <div key={i} className="flex flex-col gap-space-2 min-w-0">
          <Text variant="label" tone="ink-3" as="div">
            {f.label}
          </Text>
          <Text variant={size === 'sm' ? 'title' : 'figure'} tone={f.tone} as="div">
            {concealMoney(f.value)}
          </Text>
          {f.caption ? (
            <Text variant="caption" tone="ink-3" as="div">
              {concealMoney(f.caption)}
            </Text>
          ) : null}
        </div>
      ))}
    </div>
  );
});

FiguresRoot.displayName = 'Figures';

export interface FiguresSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** How many figures the loaded grid has. */
  count: number;
  columns?: 3 | 4;
  size?: 'sm' | 'md';
}

/** The Figures loading state, with the same grid and line heights. */
const FiguresSkeleton = forwardRef<HTMLDivElement, FiguresSkeletonProps>(({ count, columns = 3, size = 'md', className, ...props }, ref) => {
  if (count <= 0) return null;
  return (
    <div ref={ref} aria-hidden="true" className={cn(COLUMNS[size][columns], className)} {...props}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-space-2 min-w-0">
          <Skeleton width={72} height={16} />
          <Skeleton width={100} height={size === 'sm' ? 22 : 24} />
        </div>
      ))}
    </div>
  );
});

FiguresSkeleton.displayName = 'Figures.Skeleton';

export const Figures = Object.assign(FiguresRoot, { Skeleton: FiguresSkeleton });
