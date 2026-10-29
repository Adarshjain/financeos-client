import React from 'react';

import { GRID_GAP } from '@/components/ds';
import { type CreditCard, isAccountClosed } from '@/lib/account.types';

import { buildBillRows } from '../billsHistoryModel';
import { IdentifiersCard } from '../IdentifiersCard';
import { RecentTransactionsCard } from '../RecentTransactionsCard';
import { AccountHeaderCard } from './AccountHeaderCard';
import { loadCardOverviewData } from './cardOverviewData';
import {
  buildCardholders,
  buildConnections,
  buildLimitCycle,
  buildRecentTransactions,
  buildRewards,
  cardHeroFigures,
} from './cardOverviewModel';
import {
  BillsCard,
  CardholdersCard,
  ConnectionsCard,
  LimitCycleCard,
  RewardsCard,
} from './CardOverviewSections';
import { buildHeaderModel } from './headerModel';

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
  const limitCycle = buildLimitCycle(account, data.summary, data.bill, today);
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
        accountName={account.name}
        model={buildHeaderModel(account, data.bill, today)}
        figures={cardHeroFigures(limitCycle)}
      />
      <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
        <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
          <LimitCycleCard model={limitCycle} />
          {data.billHistory ? (
            <BillsCard accountId={account.id} rows={buildBillRows(data.billHistory)} />
          ) : null}
          {rewards ? <RewardsCard accountId={account.id} model={rewards} /> : null}
        </div>
        <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
          {data.cardholders ? (
            <CardholdersCard
              accountId={account.id}
              model={buildCardholders(data.cardholders, data.stats, today)}
            />
          ) : null}
          {data.identifiers ? (
            <IdentifiersCard identifiers={data.identifiers} noun="card" />
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
