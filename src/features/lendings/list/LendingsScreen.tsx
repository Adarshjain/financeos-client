import React from 'react';

import { HeroBlock } from '@/features/loans/HeroBlock';
import type { fetchPeople, fetchPeopleSummary } from '@/features/loans/loansServerApi';
import { LoadError } from '@/features/shell/LoadError';
import type { Loaded } from '@/features/shell/loadHelpers';
import { ListTransition } from '@/lib/viewTransition';

import { LendingsListCard } from './LendingsListCard';
import { lendingRow, lendingsHero, type LendingsUrlState, type TransferRow, type UnrecordedRow } from './lendingsListModel';
import { UnlinkedTransfersCard } from './UnlinkedTransfersCard';

export interface LendingsScreenProps {
  state: LendingsUrlState;
  today: string;
  /** The page of people; a failure shows in the list's place. */
  list: Loaded<Awaited<ReturnType<typeof fetchPeople>>>;
  /** The figures, or null when they could not be read. */
  summary: Awaited<ReturnType<typeof fetchPeopleSummary>> | null;
  /** How many people are settled, or null when it could not be read. */
  settledCount: number | null;
  transfers: TransferRow[];
  unrecordedTransfers: UnrecordedRow[];
}

/** The Lendings tab: the hero, the people ledger and the transfers waiting to be linked. */
export function LendingsScreen({ state, today, list, summary, settledCount, transfers, unrecordedTransfers }: LendingsScreenProps) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <HeroBlock hero={summary ? lendingsHero(summary, settledCount) : null} error="Couldn't load the figures. Try again." />
      {list.ok ? (
        <ListTransition>
          <LendingsListCard
            state={state}
            rows={list.data.content.map((p) => lendingRow(p, today))}
            totalElements={list.data.totalElements}
            totalPages={list.data.totalPages}
          />
        </ListTransition>
      ) : (
        <LoadError what="people" reference={list.reference} />
      )}
      {transfers.length > 0 || unrecordedTransfers.length > 0 ? (
        <UnlinkedTransfersCard rows={transfers} unrecorded={unrecordedTransfers} />
      ) : null}
    </div>
  );
}
