import { fetchBrokers, fetchHoldings, fetchTaxHarvest } from '@/features/investments/investmentsServerApi';
import { type Loaded, loaded, orNull } from '@/features/shell/loadHelpers';

import {
  allocationModel,
  heroModel,
  holdingsQuery,
  type HoldingsUrlState,
  moversFromResponse,
  taxCardModel,
} from './holdingsModel';
import type { HoldingsScreenProps } from './HoldingsScreen';

/** Open lots read for the "Tax this FY" card's symbols. */
const TAX_LOTS = 50;

/** Everything the Holdings screen shows, read for the address's filters and sort. Every holding is on the one page. */
export async function loadHoldingsScreen(state: HoldingsUrlState): Promise<Loaded<HoldingsScreenProps>> {
  const query = holdingsQuery(state);
  const [list, tax, brokers] = await Promise.all([loaded(fetchHoldings(query)), orNull(fetchTaxHarvest(TAX_LOTS)), orNull(fetchBrokers())]);

  if (!list.ok) return list;
  const { header, groups, holdings, movers, portfolioGroups } = list.data;
  const hero = heroModel(header, new Date());

  return {
    ok: true,
    data: {
      state,
      hero,
      rows: holdings,
      groups,
      brokers: (brokers ?? []).map((b) => ({ id: b.id, name: b.name })),
      allocation: allocationModel(portfolioGroups ?? groups),
      tax: tax ? taxCardModel(tax) : null,
      movers: moversFromResponse(movers ?? []),
    },
  };
}
