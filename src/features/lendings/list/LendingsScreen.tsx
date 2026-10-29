import React from 'react';

import type { fetchPeople, fetchPeopleSummary } from '@/features/loans/loansServerApi';
import { TileGrid } from '@/features/loans/TileGrid';
import { LoadError } from '@/features/shell/LoadError';
import type { Loaded } from '@/features/shell/loadHelpers';
import { ListTransition } from '@/lib/viewTransition';

import { LendingsListCard } from './LendingsListCard';
import { lendingRow, type LendingsUrlState, lendingTiles, type TransferRow, type UnrecordedRow } from './lendingsListModel';
import { UnlinkedTransfersCard } from './UnlinkedTransfersCard';

const TILE_LABELS = ['Owed to you', 'You owe', 'Due this month', 'Expected back'];

export interface LendingsScreenProps {
  state: LendingsUrlState;
  today: string;
  /** The page of people; a failure shows in the list's place. */
  list: Loaded<Awaited<ReturnType<typeof fetchPeople>>>;
  /** The figures, or null when they could not be read. */
  summary: Awaited<ReturnType<typeof fetchPeopleSummary>> | null;
  transfers: TransferRow[];
  unrecordedTransfers: UnrecordedRow[];
}

/** The Lendings tab: the figures, the people ledger and the transfers waiting to be linked. */
export function LendingsScreen({ state, today, list, summary, transfers, unrecordedTransfers }: LendingsScreenProps) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <TileGrid
        tiles={summary ? lendingTiles(summary) : null}
        labels={TILE_LABELS}
        error="Couldn't load this figure. Try again."
      />
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
