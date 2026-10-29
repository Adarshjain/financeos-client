import React from 'react';

import { KpiTile } from '@/components/ds';
import { FnoListSkeleton } from '@/features/investments/fno/FnoListCard';

/** Shown inside the Investments shell while F&O loads. */
export default function DsFnoLoading() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="max-desk:hidden grid grid-cols-3 gap-x-space-16 gap-y-space-8 desk:gap-y-space-16">
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
      </div>
      <FnoListSkeleton />
    </div>
  );
}
