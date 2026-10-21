'use server';

import { todayInAppZone } from '@/lib/date-range';
import { createDomainAction } from '@/lib/domainApi';
import type { LoanResponse } from '@/lib/loan.types';

import { fetchLoans } from '../loansServerApi';
import { type LoanRow, loanRow } from './loansList';

/** Loans per request; every page of each status is read, so the reveal lists them all. */
const CLOSED_PAGE_SIZE = 100;

async function allWithStatus(status: 'closed' | 'foreclosed', q: string): Promise<LoanResponse[]> {
  const loans: LoanResponse[] = [];
  for (let page = 0; ; page += 1) {
    const result = await fetchLoans({ status, q, page, size: CLOSED_PAGE_SIZE });
    loans.push(...result.content);
    if (page + 1 >= result.totalPages) return loans;
  }
}

/** Every closed and foreclosed loan matching the search, as rows, for the "Closed · n · Show" line. */
export const loadClosedLoans = createDomainAction(
  { fallbackError: 'Failed to load closed loans' },
  async (q: string): Promise<LoanRow[]> => {
    const today = todayInAppZone();
    const [closed, foreclosed] = await Promise.all([allWithStatus('closed', q), allWithStatus('foreclosed', q)]);
    return [...closed, ...foreclosed].map((loan) => loanRow(loan, today));
  },
);
