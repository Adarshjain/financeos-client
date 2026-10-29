import React, { Suspense } from 'react';

import { KpiTile } from '@/components/ds';
import { LoadError } from '@/features/shell/LoadError';

import type { AccountsListData, AccountsResult } from './accountsListData';
import {
  bankRow,
  brokerRow,
  cardBaseRow,
  cardsKpi,
  cardsSubtitle,
  cashKpi,
  closedLineFor,
  groupAccounts,
  walletRow,
} from './accountsListModel';
import {
  BankSection,
  BrokersSection,
  CardsSection,
  WalletsSection,
} from './AccountsSections';
import { AccountsEmpty } from './AccountsStates';
import {
  InvestmentsTile,
  InvestmentsTileFallback,
  NetWorthTile,
  streamedCardRow,
} from './AccountsStreamed';

/** The Accounts list body: the KPI tiles and the four sections. The accounts are loaded; the other pieces stream in. */
export function AccountsScreen({ streams, data, today }: { streams: AccountsListData; data: AccountsResult; today: string }) {
  let body: React.ReactNode;
  if (data.accounts === null) {
    body = <LoadError what="accounts" reference={data.errorReference} />;
  } else if (data.accounts.length === 0) {
    body = <AccountsEmpty />;
  } else {
    const sections = groupAccounts(data.accounts, today);
    const cash = cashKpi(sections);
    const cards = cardsKpi(sections);
    const cardRows = (cards: typeof sections.cards.open) =>
      cards.map((a) => streamedCardRow(cardBaseRow(a, today), streams, today));

    body = (
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <div className="grid grid-cols-2 desk:grid-cols-4 gap-x-space-12 gap-y-space-8 desk:gap-space-16">
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

        <div className="grid grid-cols-1 desk:grid-cols-2 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
          <BrokersSection
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

  return body;
}
