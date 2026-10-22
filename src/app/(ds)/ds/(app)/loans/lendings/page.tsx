import React from 'react';

import { directionFor, lendingRow, lendingTiles, parseLendingsUrl, transferRows, unrecordedRows } from '@/features/lendings/list/lendingsList';
import { LendingsListCard } from '@/features/lendings/list/LendingsListCard';
import { UnlinkedTransfersCard } from '@/features/lendings/list/UnlinkedTransfersCard';
import { LoansLoadError } from '@/features/loans/LoansLoadError';
import { fetchAccounts, fetchPeople, fetchPeopleMatches, fetchPeopleSummary, fetchUnrecordedTransfers } from '@/features/loans/loansServerApi';
import { TileGrid } from '@/features/loans/TileGrid';
import { loaded, orNull } from '@/features/shell/loadHelpers';
import { todayInAppZone } from '@/lib/date-range';
import { ListTransition } from '@/lib/viewTransition';

type SearchParams = { q?: string; filter?: string; page?: string; size?: string };

const TILE_LABELS = ['Owed to you', 'You owe', 'Due this month', 'Expected back'];

/** /ds/loans/lendings: the people ledger. Search, filter and page are in the URL and answered by the server. */
export default async function DsLendingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = parseLendingsUrl(await searchParams);
  const today = todayInAppZone();
  const [list, summary, matches, unrecorded] = await Promise.all([
    loaded(
      fetchPeople({ q: state.q, direction: directionFor(state.filter), page: state.page, size: state.size }),
    ),
    orNull(fetchPeopleSummary()),
    orNull(fetchPeopleMatches()),
    orNull(fetchUnrecordedTransfers()),
  ]);

  // Account names are only needed to describe the unlinked transfers, so they are fetched only for them.
  const accounts = (matches && matches.length > 0) || (unrecorded && unrecorded.length > 0) ? await orNull(fetchAccounts()) : null;
  const accountNames = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const transfers = matches ? transferRows(matches, accountNames) : [];
  const unrecordedTransfers = unrecorded ? unrecordedRows(unrecorded, accountNames) : [];

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <TileGrid
        tiles={summary ? lendingTiles(summary) : null}
        labels={TILE_LABELS}
        error="Could not load this figure"
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
        <LoansLoadError what="people" reference={list.reference} />
      )}
      {transfers.length > 0 || unrecordedTransfers.length > 0 ? (
        <UnlinkedTransfersCard rows={transfers} unrecorded={unrecordedTransfers} />
      ) : null}
    </div>
  );
}
