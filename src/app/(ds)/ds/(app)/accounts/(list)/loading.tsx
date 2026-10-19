import React from 'react';

import { KpiTile } from '@/components/ds';
import { AccountsTablesSkeleton } from '@/features/accounts/list/AccountsSections';
import { ShellPage } from '@/features/shell/ShellPage';

export default function DsAccountsLoading() {
  return (
    <ShellPage crumb="Money" title="Accounts" addParam={{ key: 'add', value: '1' }}>
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <div className="grid grid-cols-2 desk:grid-cols-4 gap-space-12 desk:gap-space-16">
          <KpiTile loading />
          <KpiTile loading />
          <KpiTile loading />
          <KpiTile loading />
        </div>
        <AccountsTablesSkeleton />
      </div>
    </ShellPage>
  );
}
