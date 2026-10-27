import React from 'react';

import { KpiTile } from '@/components/ds';
import { HoldingsListSkeleton } from '@/features/investments/holdings/HoldingsListCard';

/** Shown inside the Investments shell while Holdings loads. */
export default function DsInvestmentsLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="max-desk:hidden grid grid-cols-4 gap-x-space-16 gap-y-space-8 desk:gap-y-space-16">
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
      </div>
      <HoldingsListSkeleton />
    </div>
  );
}
