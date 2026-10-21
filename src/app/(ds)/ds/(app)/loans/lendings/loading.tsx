import React from 'react';

import { LendingsListSkeleton } from '@/features/lendings/list/LendingsListCard';
import { TileGridSkeleton } from '@/features/loans/TileGrid';

/** Shown inside the Loans & lendings shell while the Lendings tab loads. */
export default function DsLendingsLoading() {
  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <TileGridSkeleton />
      <LendingsListSkeleton />
    </div>
  );
}
