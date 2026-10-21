'use server';

import { createDomainAction } from '@/lib/domainApi';

import { fetchLoansSummary, fetchPeople } from './loansServerApi';

export interface LoansLendingsCounts {
  /** Everyone on the Lendings tab, settled people included. */
  lendings: number;
  /** Active loans. */
  loans: number;
}

/** The two tab counts: all people and active loans. */
export const loadTabCounts = createDomainAction(
  { fallbackError: 'Failed to load the tab counts' },
  async (): Promise<LoansLendingsCounts> => {
    const [people, summary] = await Promise.all([fetchPeople({ size: 1 }), fetchLoansSummary()]);
    return { lendings: people.totalElements, loans: summary.activeLoanCount };
  },
);
