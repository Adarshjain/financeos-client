import { redirect } from 'next/navigation';

import { type Loaded, loaded } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';
import { todayInAppZone } from '@/lib/date-range';

import { upToLine } from './npsImportModel';
import {
  accountCard,
  accountOptions,
  allocationLines,
  effectiveAccount,
  effectiveFy,
  entryRow,
  fyRange,
  npsFigures,
  npsUrl,
  type NpsUrlState,
  schemeGroups,
  thisFyLines,
} from './npsModel';
import type { NpsScreenProps } from './NpsScreen';
import { fetchNpsEntries, fetchNpsSummary } from './npsServerApi';

/** What the NPS view shows for the address's account, filters and page. A page past the end redirects to the last one. */
export async function loadNpsScreen(state: NpsUrlState): Promise<Loaded<NpsScreenProps>> {
  const summary = await loaded(fetchNpsSummary());
  if (!summary.ok) return summary;
  const data = summary.data;
  const account = effectiveAccount(state, data.accounts);
  // No account yet: the empty state needs nothing else.
  if (!account) {
    return { ok: true, data: { state, ledgerFy: undefined, summary: data, account: null, figures: npsFigures(data), groups: [], card: null, fyLines: [], allocation: [], entries: [], rows: [], totalElements: 0, totalPages: 0, accountOptions: [], accountValue: '' } };
  }
  // No period chosen: the FY of the newest entry in this account and tier, so imported old statements show.
  let newestDate: string | null = null;
  if (state.fy === null) {
    const newest = await loaded(fetchNpsEntries({ accountId: account.id, tier: state.tier || undefined, page: 0, size: 1 }));
    if (!newest.ok) return newest;
    newestDate = newest.data.content[0]?.postedDate ?? null;
  }
  const ledgerFy = effectiveFy(state, todayInAppZone(), newestDate);
  const list = await loaded(
    fetchNpsEntries({
      accountId: account.id,
      tier: state.tier || undefined,
      type: state.type || undefined,
      contributor: state.contributor || undefined,
      ...fyRange(ledgerFy),
      page: state.page,
      size: state.size,
    }),
  );
  if (!list.ok) return list;
  const latest = account.latestStatementEnd;
  const page = list.data;
  if (state.page > 0 && state.page >= page.totalPages && page.totalPages > 0) {
    redirect(npsUrl({ ...state, page: clampPage(state.page, page.totalPages) }));
  }
  return {
    ok: true,
    data: {
      state,
      ledgerFy,
      summary: data,
      account,
      figures: npsFigures(data),
      groups: schemeGroups(data, account),
      card: accountCard(account, latest ? upToLine(latest) : null),
      fyLines: thisFyLines(data.thisFy),
      allocation: account.tiers.map((t) => ({ tier: t.tier, lines: allocationLines(data, account, t.tier) })),
      entries: page.content,
      rows: page.content.map(entryRow),
      totalElements: page.totalElements,
      totalPages: page.totalPages,
      accountOptions: accountOptions(data.accounts),
      accountValue: account.id,
    },
  };
}
