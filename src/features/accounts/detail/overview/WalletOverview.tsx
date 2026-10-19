import React from 'react';

import type { GenericAccount } from '@/lib/account.types';

import { RecentTransactionsCard } from '../RecentTransactionsCard';
import { AccountHeaderCard } from './AccountHeaderCard';
import { loadWalletOverviewData } from './accountOverviewData';
import { buildWalletDetails, lastEntryDate } from './accountOverviewModel';
import { WalletDetailsCard } from './AccountOverviewSections';
import { buildRecentTransactions } from './cardOverviewModel';
import { buildHeaderModel } from './headerModel';

/** The wallet / cash Overview (board D-account-wallet): header, recent entries, details. */
export async function WalletOverview({ account, today }: { account: GenericAccount; today: string }) {
  const data = await loadWalletOverviewData(account);
  return (
    <>
      <AccountHeaderCard
        accountId={account.id}
        accountName={account.name}
        model={buildHeaderModel(account, null, today, lastEntryDate(data.recent?.items))}
      />
      <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-space-12 desk:gap-space-16">
        <div className="desk:col-span-7 min-w-0">
          {data.recent ? (
            <RecentTransactionsCard
              accountId={account.id}
              title="Recent entries"
              rows={buildRecentTransactions(data.recent.items)}
              total={data.recent.total}
            />
          ) : null}
        </div>
        <div className="desk:col-span-5 min-w-0">
          <WalletDetailsCard lines={buildWalletDetails(account)} />
        </div>
      </div>
    </>
  );
}
