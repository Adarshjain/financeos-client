import { loaded, orNull } from '@/features/shell/loadHelpers';
import { todayInAppZone } from '@/lib/date-range';

import { fetchLoanMatches, fetchLoans, fetchLoansSummary } from '../loansServerApi';
import type { LoansUrlState } from './loansListModel';
import type { LoansScreenProps } from './LoansScreen';

/** What the Loans tab shows for the address's search and page: the page of loans, the figures and the match offers. */
export async function loadLoansScreen(state: LoansUrlState): Promise<LoansScreenProps> {
  const [list, summary, matches] = await Promise.all([
    loaded(fetchLoans({ status: 'active', q: state.q, page: state.page, size: state.size })),
    orNull(fetchLoansSummary()),
    orNull(fetchLoanMatches()),
  ]);
  return { state, today: todayInAppZone(), list, summary, matches };
}
