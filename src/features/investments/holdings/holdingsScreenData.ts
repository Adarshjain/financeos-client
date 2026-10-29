import { redirect } from 'next/navigation';

import { fetchBrokers, fetchHoldings, fetchTaxHarvest } from '@/features/investments/investmentsServerApi';
import { type Loaded, loaded, orNull } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';

import {
  allocationModel,
  heroModel,
  holdingsQuery,
  holdingsUrl,
  type HoldingsUrlState,
  moversFromResponse,
  taxCardModel,
} from './holdingsModel';
import type { HoldingsScreenProps } from './HoldingsScreen';

/** Open lots read for the "Tax this FY" card's symbols. */
const TAX_LOTS = 50;

/** Everything the Holdings screen shows, read for the address's filters, sort and page. A page past the end redirects to the last one. */
export async function loadHoldingsScreen(state: HoldingsUrlState): Promise<Loaded<HoldingsScreenProps>> {
  const query = holdingsQuery(state);
  const [list, tax, brokers] = await Promise.all([loaded(fetchHoldings(query)), orNull(fetchTaxHarvest(TAX_LOTS)), orNull(fetchBrokers())]);

  if (!list.ok) return list;
  const { header, groups, holdings, totalElements, totalPages, movers, portfolioGroups } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(holdingsUrl({ ...state, page: clampPage(state.page, totalPages) }));
  }

  const hero = heroModel(header, new Date());

  return {
    ok: true,
    data: {
      state,
      hero,
      rows: holdings,
      groups,
      totalElements,
      totalPages,
      brokers: (brokers ?? []).map((b) => ({ id: b.id, name: b.name })),
      allocation: allocationModel(portfolioGroups ?? groups),
      tax: tax ? taxCardModel(tax) : null,
      movers: moversFromResponse(movers ?? []),
    },
  };
}
