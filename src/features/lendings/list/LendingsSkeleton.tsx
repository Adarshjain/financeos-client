import React from 'react';

import { TileGridSkeleton } from '@/features/loans/TileGrid';

import { LendingsListSkeleton } from './LendingsListCard';

/** The Lendings tab while it loads: the figures and the list. */
export function LendingsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <TileGridSkeleton />
      <LendingsListSkeleton />
    </div>
  );
}
