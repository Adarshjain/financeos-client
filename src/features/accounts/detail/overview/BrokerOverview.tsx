import React from 'react';

import type { Broker } from '@/lib/account.types';

import { RecentTransactionsCard } from '../RecentTransactionsCard';
import { AccountHeaderCard } from './AccountHeaderCard';
import { loadBrokerOverviewData } from './accountOverviewData';
import { buildBrokerCash, lastEntryDate } from './accountOverviewModel';
import { BrokerCashCard } from './AccountOverviewSections';
import { buildRecentTransactions } from './cardOverviewModel';
import { buildHeaderModel } from './headerModel';

/** The simplified broker Overview: header with portfolio value and cash, the cash card, recent transactions. */
export async function BrokerOverview({ account, today }: { account: Broker; today: string }) {
  const data = await loadBrokerOverviewData(account);
  return (
    <>
      <AccountHeaderCard
        accountId={account.id}
        accountName={account.name}
        model={buildHeaderModel(account, null, today, lastEntryDate(data.recent?.items))}
      />
      <BrokerCashCard model={buildBrokerCash(account, data.recent?.items ?? null)} />
      {data.recent ? (
        <RecentTransactionsCard
          accountId={account.id}
          rows={buildRecentTransactions(data.recent.items)}
          total={data.recent.total}
        />
      ) : null}
    </>
  );
}
