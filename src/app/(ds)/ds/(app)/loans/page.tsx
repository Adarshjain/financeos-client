import React from 'react';

import { LoanMatchBanner } from '@/features/loans/list/LoanMatchBanner';
import { closedLoansLine, loanRow, loanTiles, parseLoansUrl } from '@/features/loans/list/loansList';
import { LoansListCard } from '@/features/loans/list/LoansListCard';
import { LoansLoadError } from '@/features/loans/LoansLoadError';
import { fetchLoanMatches, fetchLoans, fetchLoansSummary } from '@/features/loans/loansServerApi';
import { TileGrid } from '@/features/loans/TileGrid';
import { loaded, orNull } from '@/features/shell/loadHelpers';
import { todayInAppZone } from '@/lib/date-range';
import { ListTransition } from '@/lib/viewTransition';

type SearchParams = { q?: string; page?: string; size?: string };

const TILE_LABELS = ['Outstanding', 'EMIs per month', 'Overdue', 'Interest this FY'];

/** /ds/loans: the active loans. Search and page are in the URL and answered by the server. */
export default async function DsLoansPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = parseLoansUrl(await searchParams);
  const today = todayInAppZone();
  const [list, summary, matches] = await Promise.all([
    loaded(fetchLoans({ status: 'active', q: state.q, page: state.page, size: state.size })),
    orNull(fetchLoansSummary()),
    orNull(fetchLoanMatches()),
  ]);

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <TileGrid
        tiles={summary ? loanTiles(summary, today) : null}
        labels={TILE_LABELS}
        error="Could not load this figure"
      />
      {matches ? <LoanMatchBanner matches={matches} /> : null}
      {list.ok ? (
        <ListTransition>
          <LoansListCard
            state={state}
            rows={list.data.content.map((loan) => loanRow(loan, today))}
            totalElements={list.data.totalElements}
            totalPages={list.data.totalPages}
            closedLine={closedLoansLine(summary?.closedLoanCount ?? 0)}
          />
        </ListTransition>
      ) : (
        <LoansLoadError what="loans" reference={list.reference} />
      )}
    </div>
  );
}
