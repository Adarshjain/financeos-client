import { orNull } from '@/features/shell/loadHelpers';
import { todayInAppZone } from '@/lib/date-range';

import { fetchLoans, fetchLoansSummary } from '../loansServerApi';
import { closedLoansLine, type LoanRow, loanRow } from './loansListModel';

/** Loans per request; every page of active loans is read so the Accounts card lists them all. */
const PAGE_SIZE = 100;

export interface LoansCardData {
  rows: LoanRow[];
  /** "Closed · n" for the Show line; null when none. */
  closedLine: string | null;
}

/** The Loans card on Accounts: every active loan as a row, and how many closed ones there are. Null when the loans could not be read. */
export async function loadLoansCard(): Promise<LoansCardData | null> {
  const today = todayInAppZone();
  const read = async () => {
    const loans = [];
    for (let page = 0; ; page += 1) {
      const result = await fetchLoans({ status: 'active', q: '', page, size: PAGE_SIZE });
      loans.push(...result.content);
      if (page + 1 >= result.totalPages) return loans;
    }
  };
  const [loans, summary] = await Promise.all([orNull(read()), orNull(fetchLoansSummary())]);
  if (!loans) return null;
  return { rows: loans.map((loan) => loanRow(loan, today)), closedLine: closedLoansLine(summary?.closedLoanCount ?? 0) };
}
