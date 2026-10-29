import React, { Suspense } from 'react';

import { GRID_GAP, Hero, Skeleton } from '@/components/ds';
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
  investmentsKpi,
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
  InvestmentsDelta,
  NetWorthValue,
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
    const invest = investmentsKpi(sections, null);
    const cardRows = (cards: typeof sections.cards.open) =>
      cards.map((a) => streamedCardRow(cardBaseRow(a, today), streams, today));

    body = (
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Hero
          label="Net worth"
          value={
            <Suspense fallback={<Skeleton width={180} height={40} />}>
              <NetWorthValue netWorth={streams.netWorth} />
            </Suspense>
          }
          figures={[
            { label: cash.label, value: cash.value },
            { label: cards.label, value: cards.value, tone: cards.tone, caption: cards.context },
            {
              label: invest.label,
              value: invest.value,
              caption: (
                <Suspense fallback={null}>
                  <InvestmentsDelta sections={sections} dayChangePct={streams.dayChangePct} />
                </Suspense>
              ),
            },
          ]}
        />

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

        <div className={`grid grid-cols-1 desk:grid-cols-2 items-start ${GRID_GAP}`}>
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
