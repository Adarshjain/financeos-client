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
  GmailAlertsCard,
  LinkedCard,
  StatementsCard,
} from './AccountOverviewSections';
import { buildRecentTransactions } from './cardOverviewModel';
import { buildHeaderModel } from './headerModel';

/** The bank Overview (board D-account-bank): header and hero (balance, 90-day flow), statements, what pays from it, identifiers, recent transactions, Gmail alerts (connections last, like the card). */
export async function BankOverview({ account, today }: { account: BankAccount; today: string }) {
  const data = await loadBankOverviewData(account);
  const closed = isAccountClosed(account, today);
  const linked = data.payments ? buildLinked(data.payments) : [];

  return (
    <>
      <AccountHeaderCard
        accountName={account.name}
        model={buildHeaderModel(account, null, today)}
        figures={data.flow ? buildFlowKpis(data.flow).map((k) => ({ label: k.label, value: k.value, caption: k.context })) : undefined}
      />
      <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
        <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
          {data.statements ? (
            <StatementsCard
              accountId={account.id}
              row={buildLatestStatement(data.statements, account)}
              canUpload={!closed}
            />
          ) : null}
          {linked.length > 0 ? <LinkedCard lines={linked} /> : null}
        </div>
        <div className="desk:col-span-5 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
          {data.identifiers ? (
            <IdentifiersCard identifiers={data.identifiers} />
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
      <GmailAlertsCard
        model={buildGmailCard({
          ingestFromDate: account.ingestFromDate,
          lastAlert: data.gmail?.lastAlert,
          unmatchedCount: data.gmail?.unmatchedCount,
          today,
        })}
      />
    </>
  );
}
