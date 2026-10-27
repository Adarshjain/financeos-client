import React from 'react';

import { KpiTile } from '@/components/ds';
import { AccountsTablesSkeleton } from '@/features/accounts/list/AccountsSections';
import { AccountsShellPage } from '@/features/accounts/list/AccountsShellPage';

export default function DsAccountsLoading() {
  return (
    <AccountsShellPage>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <div className="grid grid-cols-2 desk:grid-cols-4 gap-x-space-12 gap-y-space-8 desk:gap-space-16">
          <KpiTile loading />
          <KpiTile loading />
          <KpiTile loading />
          <KpiTile loading />
        </div>
        <AccountsTablesSkeleton />
      </div>
    </AccountsShellPage>
  );
}
