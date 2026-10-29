import React from 'react';

import { KpiTile } from '@/components/ds';
import { EpfPassbookSkeleton } from '@/features/investments/epf/EpfPassbookCard';

/** Shown inside the Investments shell while EPF loads. */
export default function DsEpfLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="max-desk:hidden grid grid-cols-4 gap-space-16">
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
      </div>
      <EpfPassbookSkeleton />
    </div>
  );
}
