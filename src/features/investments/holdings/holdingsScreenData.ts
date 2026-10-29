import { redirect } from 'next/navigation';

import { fetchBrokers, fetchHoldings, fetchTaxHarvest } from '@/features/investments/investmentsServerApi';
import { type Loaded, loaded, orNull } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';

import {
  allocationModel,
  heroModel,
  holdingsQuery,
  holdingsTiles,
  holdingsUrl,
  type HoldingsUrlState,
  taxCardModel,
  topMovers,
} from './holdingsModel';
import type { HoldingsScreenProps } from './HoldingsScreen';

/** Open lots read for the "Tax this FY" card's symbols. */
const TAX_LOTS = 50;
/** Most holdings read to find today's top movers when the list is paged. */
const MOVERS_SCAN = 200;

/** Everything the Holdings screen shows, read for the address's filters, sort and page. A page past the end redirects to the last one. */
export async function loadHoldingsScreen(state: HoldingsUrlState): Promise<Loaded<HoldingsScreenProps>> {
  const query = holdingsQuery(state);
  // With a type filter the server's groups hold only that type; Allocation covers the whole portfolio (broker filter kept).
  const wholeQuery = { brokerAccountId: query.brokerAccountId, sort: 'name' as const, page: 0, size: 1 };
  const [list, whole, tax, brokers] = await Promise.all([
    loaded(fetchHoldings(query)),
    state.type ? orNull(fetchHoldings(wholeQuery)) : Promise.resolve(null),
    orNull(fetchTaxHarvest(TAX_LOTS)),
    orNull(fetchBrokers()),
  ]);

  if (!list.ok) return list;
  const { header, groups, holdings, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(holdingsUrl({ ...state, page: clampPage(state.page, totalPages) }));
  }
  const portfolioGroups = whole?.groups ?? groups;

  // Top movers look at every holding of the filter, not only the page on screen.
  const scan =
    totalPages > 1
      ? ((await orNull(fetchHoldings({ ...query, sort: 'name', dir: undefined, page: 0, size: MOVERS_SCAN })))?.holdings ?? holdings)
      : holdings;
  const hero = heroModel(header, new Date());

  return {
    ok: true,
    data: {
      state,
      hero,
      tiles: holdingsTiles(header, groups.reduce((n, g) => n + g.count, 0), tax),
      rows: holdings,
      groups,
      totalElements,
      totalPages,
      brokers: (brokers ?? []).map((b) => ({ id: b.id, name: b.name })),
      allocation: allocationModel(portfolioGroups),
      tax: tax ? taxCardModel(tax) : null,
      movers: topMovers(scan),
    },
  };
}
