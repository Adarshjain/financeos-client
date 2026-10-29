import React from 'react';

import {
  GRID_GAP,
  KpiTile,
} from '@/components/ds';

import { AccountsTablesSkeleton } from './AccountsSections';

/** The Accounts list while it loads: four KPI tiles and the tables. */
export function AccountsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className={`grid grid-cols-2 desk:grid-cols-4 ${GRID_GAP}`}>
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
        <KpiTile loading />
      </div>
      <AccountsTablesSkeleton />
    </div>
  );
}
