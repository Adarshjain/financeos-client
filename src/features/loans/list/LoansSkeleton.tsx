import React from 'react';

import { TileGridSkeleton } from '../TileGrid';
import { LoansListSkeleton } from './LoansListCard';

/** The Loans tab while it loads: the figures and the list. */
export function LoansSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <TileGridSkeleton />
      <LoansListSkeleton />
    </div>
  );
}
