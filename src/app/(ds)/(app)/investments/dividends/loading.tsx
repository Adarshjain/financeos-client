import React from 'react';

import { KpiTile } from '@/components/ds';
import { DividendsListSkeleton } from '@/features/investments/dividends/DividendsListCard';

/** Shown inside the Investments shell while Dividends loads. */
export default function DsDividendsLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="max-desk:hidden grid grid-cols-4 gap-x-space-16 gap-y-space-8 desk:gap-y-space-16">
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
      </div>
      <DividendsListSkeleton />
    </div>
  );
}
