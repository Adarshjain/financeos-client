import React from 'react';

import { LoansListSkeleton } from '@/features/loans/list/LoansListCard';
import { TileGridSkeleton } from '@/features/loans/TileGrid';

/** Shown inside the Loans & lendings shell while the Loans tab loads. */
export default function DsLoansLoading() {
  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <TileGridSkeleton />
      <LoansListSkeleton />
    </div>
  );
}
