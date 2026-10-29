import React from 'react';

import { LoadError } from '@/features/shell/LoadError';
import type { Loaded } from '@/features/shell/loadHelpers';
import { ListTransition } from '@/lib/viewTransition';

import { HeroBlock } from '../HeroBlock';
import type { fetchLoanMatches, fetchLoans, fetchLoansSummary } from '../loansServerApi';
import { LoanMatchBanner } from './LoanMatchBanner';
import { LoansListCard } from './LoansListCard';
import { closedLoansLine, loanRow, loansHero, type LoansUrlState } from './loansListModel';

export interface LoansScreenProps {
  state: LoansUrlState;
  today: string;
  /** The page of active loans; a failure shows in the list's place. */
  list: Loaded<Awaited<ReturnType<typeof fetchLoans>>>;
  /** The figures, or null when they could not be read. */
  summary: Awaited<ReturnType<typeof fetchLoansSummary>> | null;
  matches: Awaited<ReturnType<typeof fetchLoanMatches>> | null;
}

/** The Loans tab: the hero, the match banner and the list of active loans. */
export function LoansScreen({ state, today, list, summary, matches }: LoansScreenProps) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <HeroBlock hero={summary ? loansHero(summary, today) : null} error="Couldn't load the figures. Try again." />
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
        <LoadError what="loans" reference={list.reference} />
      )}
    </div>
  );
}
