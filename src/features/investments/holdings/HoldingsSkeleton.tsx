import React from 'react';

import { Hero } from '@/components/ds/Hero/Hero';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { FilterRowSkeleton } from '@/features/investments/FilterRowSkeleton';

import { HoldingsListSkeleton } from './HoldingsListCard';

/** Holdings while it loads: the hero, its price line (skeleton height), the filter row and the list. */
export function HoldingsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Hero.Skeleton label change figures={2} />
      <Skeleton width={140} height={16} />
      <FilterRowSkeleton />
      <HoldingsListSkeleton />
    </div>
  );
}
