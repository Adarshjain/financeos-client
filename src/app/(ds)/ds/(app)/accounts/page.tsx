import React from 'react';

import { KpiTile } from '@/components/ds';
import {
  bankRow,
  brokerRow,
  cardRow,
  cardsKpi,
  cardsSubtitle,
  cashKpi,
  CLOSED_SECTIONS,
  closedLineFor,
  type ClosedSection,
  formatRupees,
  groupAccounts,
  investmentsKpi,
  netWorthKpi,
  walletRow,
} from '@/features/accounts/list/accountsList';
import { loadAccountsListData } from '@/features/accounts/list/accountsListData';
import {
  BankSection,
  BrokersSection,
  CardsSection,
  WalletsSection,
} from '@/features/accounts/list/AccountsSections';
import {
  AccountsEmpty,
  AccountsLoadError,
} from '@/features/accounts/list/AccountsStates';
import { ShellPage } from '@/features/shell/ShellPage';
import { sumBalances } from '@/lib/accountTotals';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsAccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ closed?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const closedParam = CLOSED_SECTIONS.find((s) => s === params?.closed) as
    | ClosedSection
    | undefined;
  const today = todayInAppZone();
  const data = await loadAccountsListData();

  let body: React.ReactNode;
  if (data.accounts === null) {
    body = <AccountsLoadError reference={data.errorReference} />;
  } else if (data.accounts.length === 0) {
    body = <AccountsEmpty />;
  } else {
    const sections = groupAccounts(data.accounts, today);
    const billByAccount = new Map(
      (data.bills ?? []).map((b) => [b.accountId, b])
    );
    const rewardByAccount = new Map(
      (data.rewards ?? []).map((r) => [r.accountId, r])
    );
    const cash = cashKpi(sections);
    const cards = cardsKpi(sections);
    const investments = investmentsKpi(sections, data.dayChangePct);
    const netWorth = data.netWorth === null ? null : netWorthKpi(data.netWorth);

    body = (
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <div className="grid grid-cols-2 desk:grid-cols-4 gap-space-12 desk:gap-space-16">
          <KpiTile
            label={cash.label}
            value={cash.value}
            context={cash.context}
          />
          <KpiTile
            label={cards.label}
            value={cards.value}
            context={cards.context}
          />
          <KpiTile
            label={investments.label}
            value={investments.value}
            delta={investments.delta}
          />
          {netWorth ? (
            <KpiTile label={netWorth.label} value={netWorth.value} />
          ) : (
            <KpiTile label="Net worth" error="Could not load net worth" />
          )}
        </div>

        <BankSection
          rows={sections.banks.open.map((a) => bankRow(a, today))}
          closedRows={sections.banks.closed.map((a) => bankRow(a, today))}
          closedLine={closedLineFor(sections.banks.closed)}
          showClosed={closedParam === 'banks'}
        />

        <CardsSection
          subtitle={cardsSubtitle(sections.cards.open)}
          rows={sections.cards.open.map((a) =>
            cardRow(
              a,
              billByAccount.get(a.id),
              rewardByAccount.get(a.id),
              today
            )
          )}
          closedRows={sections.cards.closed.map((a) =>
            cardRow(
              a,
              billByAccount.get(a.id),
              rewardByAccount.get(a.id),
              today
            )
          )}
          closedLine={closedLineFor(sections.cards.closed)}
          showClosed={closedParam === 'cards'}
        />

        <div className="grid grid-cols-1 desk:grid-cols-2 items-start gap-space-12 desk:gap-space-16">
          <BrokersSection
            title={`Brokers · ${formatRupees(sumBalances(sections.brokers.open))}`}
            rows={sections.brokers.open.map((a) => brokerRow(a, today))}
            closedRows={sections.brokers.closed.map((a) => brokerRow(a, today))}
            closedLine={closedLineFor(sections.brokers.closed)}
            showClosed={closedParam === 'brokers'}
          />
          <WalletsSection
            rows={sections.wallets.open.map((a) => walletRow(a, today))}
            closedRows={sections.wallets.closed.map((a) => walletRow(a, today))}
            closedLine={closedLineFor(sections.wallets.closed)}
            showClosed={closedParam === 'wallets'}
          />
        </div>
      </div>
    );
  }

  return (
    <ShellPage crumb="Money" title="Accounts" addHref="/ds/accounts/new">
      {body}
    </ShellPage>
  );
}
