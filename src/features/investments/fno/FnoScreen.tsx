import React from 'react';

import { fyLabel } from '@/features/investments/investmentsFormat';

import { FnoHero, FnoTiles, MonthCard, UnderlyingCard } from './FnoFigures';
import { FnoListCard, type FnoListCardProps } from './FnoListCard';
import type { figuresModel, monthRows, underlyingRows } from './fnoModel';

export interface FnoScreenProps extends FnoListCardProps {
  /** The headline figures, or null when the summary could not be read. */
  figures: ReturnType<typeof figuresModel> | null;
  months: ReturnType<typeof monthRows>;
  underlyings: ReturnType<typeof underlyingRows>;
}

/** F&O: the hero and figures, the paged trades, then the month and underlying breakdowns. */
export function FnoScreen({ figures, months, underlyings, ...list }: FnoScreenProps) {
  const allYears = list.state.fy == null;
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {figures ? <FnoHero figures={figures} allYears={allYears} /> : null}
      <FnoTiles figures={figures} allYears={allYears} />
      <FnoListCard {...list} />
      {months.length > 0 || underlyings.length > 0 ? (
        <div className="grid grid-cols-1 desk:grid-cols-2 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
          {months.length > 0 ? <MonthCard rows={months} fy={fyLabel(list.state.fy!)} /> : null}
          {underlyings.length > 0 ? <UnderlyingCard rows={underlyings} /> : null}
        </div>
      ) : null}
    </div>
  );
}
