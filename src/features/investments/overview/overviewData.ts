import { fetchEpfEmployers, fetchEpfSummary } from '@/features/investments/epf/epfServerApi';
import { fetchHoldings } from '@/features/investments/investmentsServerApi';
import { fetchNpsSummary } from '@/features/investments/nps/npsServerApi';
import { loaded } from '@/features/shell/loadHelpers';

import { type OverviewCardModel, overviewCards } from './overviewModel';

/**
 * What the Investments landing shows: each product's hero numbers, from the loaders its own screen uses. Holdings asks
 * for one row (its header carries the hero); a product that fails to load becomes its own error card.
 */
export async function loadInvestmentsOverview(): Promise<OverviewCardModel[]> {
  const [holdings, epf, employers, nps] = await Promise.all([
    loaded(fetchHoldings({ sort: 'name', page: 0, size: 1 })),
    loaded(fetchEpfSummary()),
    loaded(fetchEpfEmployers()),
    loaded(fetchNpsSummary()),
  ]);
  return overviewCards({ holdings, epf, employers, nps });
}
