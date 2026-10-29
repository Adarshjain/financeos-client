import { fetchAccounts, fetchPeople, fetchPeopleMatches, fetchPeopleSummary, fetchUnrecordedTransfers } from '@/features/loans/loansServerApi';
import { loaded, orNull } from '@/features/shell/loadHelpers';
import { todayInAppZone } from '@/lib/date-range';

import { directionFor, type LendingsUrlState, transferRows, unrecordedRows } from './lendingsListModel';
import type { LendingsScreenProps } from './LendingsScreen';

/** What the Lendings tab shows for the address's search, filter and page. */
export async function loadLendingsScreen(state: LendingsUrlState): Promise<LendingsScreenProps> {
  const [list, summary, matches, unrecorded] = await Promise.all([
    loaded(fetchPeople({ q: state.q, direction: directionFor(state.filter), page: state.page, size: state.size })),
    orNull(fetchPeopleSummary()),
    orNull(fetchPeopleMatches()),
    orNull(fetchUnrecordedTransfers()),
  ]);

  // Account names are only needed to describe the unlinked transfers, so they are fetched only for them.
  const accounts = (matches && matches.length > 0) || (unrecorded && unrecorded.length > 0) ? await orNull(fetchAccounts()) : null;
  const accountNames = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  return {
    state,
    today: todayInAppZone(),
    list,
    summary,
    transfers: matches ? transferRows(matches, accountNames) : [],
    unrecordedTransfers: unrecorded ? unrecordedRows(unrecorded, accountNames) : [],
  };
}
