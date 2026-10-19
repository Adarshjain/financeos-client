import React, { Suspense } from 'react';

import { KpiTile } from '@/components/ds';
import { AddAccountHost } from '@/features/accounts/form/ds/AccountFormHosts';
import {
  bankRow,
  brokerRow,
  cardBaseRow,
  cardsKpi,
  cardsSubtitle,
  cashKpi,
  closedLineFor,
  formatRupees,
  groupAccounts,
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
import {
  InvestmentsTile,
  InvestmentsTileFallback,
  NetWorthTile,
  streamedCardRow,
} from '@/features/accounts/list/AccountsStreamed';
import { ShellPage } from '@/features/shell/ShellPage';
import { sumBalances } from '@/lib/accountTotals';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsAccountsPage() {
  const today = todayInAppZone();
  // All five requests start now; only the accounts are awaited, the rest stream in below.
  const streams = loadAccountsListData();
  const data = await streams.accounts;

  let body: React.ReactNode;
  if (data.accounts === null) {
    body = <AccountsLoadError reference={data.errorReference} />;
  } else if (data.accounts.length === 0) {
    body = <AccountsEmpty />;
  } else {
    const sections = groupAccounts(data.accounts, today);
    const cash = cashKpi(sections);
    const cards = cardsKpi(sections);
    const cardRows = (cards: typeof sections.cards.open) =>
      cards.map((a) => streamedCardRow(cardBaseRow(a, today), streams, today));

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
          <Suspense fallback={<InvestmentsTileFallback sections={sections} />}>
            <InvestmentsTile
              sections={sections}
              dayChangePct={streams.dayChangePct}
            />
          </Suspense>
          <Suspense fallback={<KpiTile loading />}>
            <NetWorthTile netWorth={streams.netWorth} />
          </Suspense>
        </div>

        <BankSection
          rows={sections.banks.open.map((a) => bankRow(a, today))}
          closedRows={sections.banks.closed.map((a) => bankRow(a, today))}
          closedLine={closedLineFor(sections.banks.closed)}
        />

        <CardsSection
          subtitle={cardsSubtitle(sections.cards.open)}
          rows={cardRows(sections.cards.open)}
          closedRows={cardRows(sections.cards.closed)}
          closedLine={closedLineFor(sections.cards.closed)}
        />

        <div className="grid grid-cols-1 desk:grid-cols-2 items-start gap-space-12 desk:gap-space-16">
          <BrokersSection
            title={`Brokers · ${formatRupees(sumBalances(sections.brokers.open))}`}
            rows={sections.brokers.open.map((a) => brokerRow(a, today))}
            closedRows={sections.brokers.closed.map((a) => brokerRow(a, today))}
            closedLine={closedLineFor(sections.brokers.closed)}
          />
          <WalletsSection
            rows={sections.wallets.open.map((a) => walletRow(a, today))}
            closedRows={sections.wallets.closed.map((a) => walletRow(a, today))}
            closedLine={closedLineFor(sections.wallets.closed)}
          />
        </div>
      </div>
    );
  }

  return (
    <ShellPage crumb="Money" title="Accounts" addHref="/ds/accounts?add=1">
      {body}
      <AddAccountHost />
    </ShellPage>
  );
}
