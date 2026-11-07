import { orNull } from '@/features/shell/loadHelpers';
import { todayInAppZone } from '@/lib/date-range';

import { fetchLoans, fetchLoansSummary } from '../loansServerApi';
import { closedLoansLine, type LoanRow, loanRow } from './loansListModel';

/** Active loans the Accounts card lists (one server page); the rest are on the Loans page behind "All loans". */
const CARD_SIZE = 20;

export interface LoansCardData {
  rows: LoanRow[];
  /** "Closed · n" for the Show line; null when none. */
  closedLine: string | null;
}

/** The Loans card on Accounts: the first page of active loans as rows, and how many closed ones there are. Null when the loans could not be read. */
export async function loadLoansCard(): Promise<LoansCardData | null> {
  const today = todayInAppZone();
  const read = async () => (await fetchLoans({ status: 'active', q: '', page: 0, size: CARD_SIZE })).content;
  const [loans, summary] = await Promise.all([orNull(read()), orNull(fetchLoansSummary())]);
  if (!loans) return null;
  return { rows: loans.map((loan) => loanRow(loan, today)), closedLine: closedLoansLine(summary?.closedLoanCount ?? 0) };
}
