import React from 'react';

import { type CreditCard, isAccountClosed } from '@/lib/account.types';

import { buildBillRows } from '../billsHistoryModel';
import { AccountHeaderCard } from './AccountHeaderCard';
import { loadCardOverviewData } from './cardOverviewData';
import {
  buildCardholders,
  buildConnections,
  buildLimitCycle,
  buildRecentTransactions,
  buildRewards,
} from './cardOverviewModel';
import {
  BillsCard,
  CardholdersCard,
  ConnectionsCard,
  IdentifiersCard,
  LimitCycleCard,
  RewardsCard,
} from './CardOverviewSections';
import { buildHeaderModel } from './headerModel';
import { RecentTransactionsCard } from './RecentTransactionsCard';

/** The credit-card Overview (board D-account-card): header, limit and cycle, bills, rewards, cardholders, identifiers, recent transactions, connections. */
export async function CardOverview({
  account,
  today,
}: {
  account: CreditCard;
  today: string;
}) {
  const data = await loadCardOverviewData(account, today);
  const closed = isAccountClosed(account, today);
  const rewards = closed
    ? null
    : buildRewards(data.rewards?.report, data.rewards?.window, today);
  const connections = buildConnections({
    lastStatementDate: account.lastStatementDate,
    ingestFromDate: account.ingestFromDate,
    identifierCount: data.identifiers?.length ?? null,
    lastMatchDate: data.gmail?.lastMatchDate,
    unmatchedCount: data.gmail?.unmatchedCount,
  });

  return (
    <>
      <AccountHeaderCard
        accountId={account.id}
        accountName={account.name}
        model={buildHeaderModel(account, data.bill, today)}
      />
      <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-space-12 desk:gap-space-16">
        <div className="desk:col-span-7 flex flex-col gap-space-12 desk:gap-space-16 min-w-0">
          <LimitCycleCard model={buildLimitCycle(account, data.summary, data.bill, today)} />
          {data.billHistory ? (
            <BillsCard accountId={account.id} rows={buildBillRows(data.billHistory)} />
          ) : null}
          {rewards ? <RewardsCard accountId={account.id} model={rewards} /> : null}
        </div>
        <div className="desk:col-span-5 flex flex-col gap-space-12 desk:gap-space-16 min-w-0">
          {data.cardholders ? (
            <CardholdersCard
              accountId={account.id}
              model={buildCardholders(data.cardholders, data.stats, today)}
            />
          ) : null}
          {data.identifiers ? (
            <IdentifiersCard accountId={account.id} identifiers={data.identifiers} />
          ) : null}
        </div>
      </div>
      {data.recent ? (
        <RecentTransactionsCard
          accountId={account.id}
          rows={buildRecentTransactions(data.recent.items)}
          total={data.recent.total}
        />
      ) : null}
      <ConnectionsCard model={connections} />
    </>
  );
}
