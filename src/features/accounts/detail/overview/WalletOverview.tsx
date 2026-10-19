import React from 'react';

import type { GenericAccount } from '@/lib/account.types';

import { RecentTransactionsCard } from '../RecentTransactionsCard';
import { AccountHeaderCard } from './AccountHeaderCard';
import { loadWalletOverviewData } from './accountOverviewData';
import { lastEntryDate } from './accountOverviewModel';
import { buildRecentTransactions } from './cardOverviewModel';
import { buildHeaderModel } from './headerModel';

/** The wallet / cash Overview (board D-account-wallet): header, recent entries. */
export async function WalletOverview({ account, today }: { account: GenericAccount; today: string }) {
  const data = await loadWalletOverviewData(account);
  return (
    <>
      <AccountHeaderCard
        accountName={account.name}
        model={buildHeaderModel(account, null, today, lastEntryDate(data.recent?.items))}
      />
      {data.recent ? (
        <RecentTransactionsCard
          accountId={account.id}
          title="Recent entries"
          rows={buildRecentTransactions(data.recent.items)}
          total={data.recent.total}
        />
      ) : null}
    </>
  );
}
