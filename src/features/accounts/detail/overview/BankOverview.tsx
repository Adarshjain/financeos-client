import React from 'react';

import { GRID_GAP } from '@/components/ds';
import { type BankAccount, isAccountClosed } from '@/lib/account.types';

import { IdentifiersCard } from '../IdentifiersCard';
import { RecentTransactionsCard } from '../RecentTransactionsCard';
import { AccountHeaderCard } from './AccountHeaderCard';
import { loadBankOverviewData } from './accountOverviewData';
import {
  buildFlowKpis,
  buildGmailCard,
  buildLatestStatement,
  buildLinked,
} from './accountOverviewModel';
import {
  FlowKpis,
  GmailAlertsCard,
  LinkedCard,
  StatementsCard,
} from './AccountOverviewSections';
import { buildRecentTransactions } from './cardOverviewModel';
import { buildHeaderModel } from './headerModel';

/** The bank Overview (board D-account-bank): header, 90-day flow, recent transactions; statements, Gmail alerts, identifiers, what pays from it. */
export async function BankOverview({ account, today }: { account: BankAccount; today: string }) {
  const data = await loadBankOverviewData(account);
  const closed = isAccountClosed(account, today);
  const linked = data.payments ? buildLinked(data.payments) : [];

  return (
    <>
      <AccountHeaderCard
        accountName={account.name}
        model={buildHeaderModel(account, null, today)}
      />
      <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
        <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
          {data.flow ? <FlowKpis tiles={buildFlowKpis(data.flow)} /> : null}
          {data.recent ? (
            <RecentTransactionsCard
              accountId={account.id}
              rows={buildRecentTransactions(data.recent.items)}
              total={data.recent.total}
            />
          ) : null}
        </div>
        <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
          {data.statements ? (
            <StatementsCard
              accountId={account.id}
              row={buildLatestStatement(data.statements, account)}
              canUpload={!closed}
            />
          ) : null}
          <GmailAlertsCard
            model={buildGmailCard({
              ingestFromDate: account.ingestFromDate,
              lastAlert: data.gmail?.lastAlert,
              unmatchedCount: data.gmail?.unmatchedCount,
              today,
            })}
          />
          {data.identifiers ? (
            <IdentifiersCard identifiers={data.identifiers} />
          ) : null}
          {linked.length > 0 ? <LinkedCard lines={linked} /> : null}
        </div>
      </div>
    </>
  );
}
