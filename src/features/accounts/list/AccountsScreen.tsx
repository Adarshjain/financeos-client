import React, { Suspense } from 'react';

import { GRID_GAP } from '@/components/ds/gridGap';
import { Hero } from '@/components/ds/Hero/Hero';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import type { AccountSuggestions } from '@/features/accounts/list/suggestionsModel';
import { RetirementCardSkeleton } from '@/features/investments/retirement/RetirementCard';
import { LoansCardSkeleton } from '@/features/loans/list/LoansCard';
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
  InvestmentsValue,
  LoansSection,
  NetWorthValue,
  RetirementSection,
  streamedCardRow,
} from './AccountsStreamed';
import { FoundInEmailCard } from './FoundInEmailCard';
import { ScanProgressCard } from './ScanProgressCard';
import {
  accountsBodyMode,
  isScanProgressShown,
  mergeSuggestions,
  scanningEmptyCopy,
  splitSuggestions,
  suggestionCount,
} from './suggestionsModel';

/** The Accounts list body: the KPI tiles and the four sections. The accounts are loaded; the other pieces stream in. */
export function AccountsScreen({
  streams,
  data,
  suggestions,
  today,
}: {
  streams: AccountsListData;
  data: AccountsResult;
  suggestions: AccountSuggestions | null;
  today: string;
}) {
  let body: React.ReactNode;
  const scan = suggestions?.scan ?? null;
  const progressShown = isScanProgressShown(scan);
  const found = splitSuggestions(suggestions?.items ?? [], data.accounts ?? []);
  const foundCount = suggestionCount(found.bank.bands) + suggestionCount(found.card.bands);
  const mode = accountsBodyMode({
    accountCount: data.accounts?.length ?? 0,
    progressShown,
    suggestionCount: foundCount,
  });
  if (data.accounts === null) {
    body = <LoadError what="accounts" reference={data.errorReference} />;
  } else if (mode === 'empty') {
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
        {progressShown && scan ? <ScanProgressCard scan={scan} /> : null}
        {mode === 'full' ? (
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
              value: (
                <Suspense fallback={<Skeleton width={96} height={20} />}>
                  <InvestmentsValue sections={sections} retirement={streams.retirement} />
                </Suspense>
              ),
              caption: (
                <Suspense fallback={null}>
                  <InvestmentsDelta sections={sections} dayChangePct={streams.dayChangePct} />
                </Suspense>
              ),
            },
          ]}
        />
        ) : null}
        {foundCount > 0 ? <FoundInEmailCard suggestions={mergeSuggestions(found)} /> : null}

        <SectionHeader as="h2" variant="strong" sticky={false} className="px-0">
          What you have
        </SectionHeader>

        <BankSection
          rows={sections.banks.open.map((a) => bankRow(a, today))}
          closedRows={sections.banks.closed.map((a) => bankRow(a, today))}
          closedLine={closedLineFor(sections.banks.closed)}
          emptyText={scanningEmptyCopy('bank', progressShown)}
        />

        <div className={`grid grid-cols-1 desk:grid-cols-2 items-start ${GRID_GAP}`}>
          <BrokersSection
            rows={sections.brokers.open.map((a) => brokerRow(a, today))}
            closedRows={sections.brokers.closed.map((a) => brokerRow(a, today))}
            closedLine={closedLineFor(sections.brokers.closed)}
            emptyText={scanningEmptyCopy('broker', progressShown)}
          />
          <WalletsSection
            rows={sections.wallets.open.map((a) => walletRow(a, today))}
            closedRows={sections.wallets.closed.map((a) => walletRow(a, today))}
            closedLine={closedLineFor(sections.wallets.closed)}
          />
        </div>

        <Suspense fallback={<RetirementCardSkeleton />}>
          <RetirementSection retirement={streams.retirement} />
        </Suspense>

        <SectionHeader as="h2" variant="strong" sticky={false} className="px-0">
          What you owe
        </SectionHeader>

        <CardsSection
          subtitle={cardsSubtitle(sections.cards.open)}
          rows={cardRows(sections.cards.open)}
          closedRows={cardRows(sections.cards.closed)}
          closedLine={closedLineFor(sections.cards.closed)}
          emptyText={scanningEmptyCopy('card', progressShown)}
        />

        <Suspense fallback={<LoansCardSkeleton />}>
          <LoansSection loans={streams.loans} />
        </Suspense>
      </div>
    );
  }

  return body;
}
