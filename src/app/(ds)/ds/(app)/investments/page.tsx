import { redirect } from 'next/navigation';
import React from 'react';

import { AllocationCard, HoldingsHero, HoldingsTiles, TaxCard, TopMoversCard } from '@/features/investments/holdings/HoldingsFigures';
import { HoldingsListCard } from '@/features/investments/holdings/HoldingsListCard';
import {
  allocationModel,
  heroModel,
  holdingsQuery,
  holdingsTiles,
  holdingsUrl,
  parseHoldingsUrl,
  taxCardModel,
  topMovers,
} from '@/features/investments/holdings/holdingsModel';
import { PricesLine } from '@/features/investments/holdings/PricesLine';
import {
  fetchBrokers,
  fetchHoldings,
  fetchLatestPriceJobId,
  fetchTaxHarvest,
} from '@/features/investments/investmentsServerApi';
import { LoansLoadError } from '@/features/loans/LoansLoadError';
import { loaded, orNull } from '@/features/shell/loadHelpers';

type SearchParams = { q?: string; type?: string; broker?: string; sort?: string; page?: string; size?: string };

/** Open lots read for the "Tax this FY" card's symbols. */
const TAX_LOTS = 50;
/** Most holdings read to find today's top movers when the list is paged. */
const MOVERS_SCAN = 200;

const TILE_LABELS = ['Current value', 'Invested', 'Unrealised P&L', 'Realised this FY'];

/** /ds/investments: Holdings. The filters, sort and page are in the URL and answered by the server. */
export default async function DsInvestmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = parseHoldingsUrl(await searchParams);
  const query = holdingsQuery(state);
  // With a type filter the server's groups hold only that type; the chip counts and Allocation cover the whole portfolio (broker filter kept).
  const wholeQuery = { brokerAccountId: query.brokerAccountId, sort: 'name' as const, page: 0, size: 1 };
  const [list, whole, tax, brokers, latestJobId] = await Promise.all([
    loaded(fetchHoldings(query)),
    state.type ? orNull(fetchHoldings(wholeQuery)) : Promise.resolve(null),
    orNull(fetchTaxHarvest(TAX_LOTS)),
    orNull(fetchBrokers()),
    orNull(fetchLatestPriceJobId()),
  ]);

  if (!list.ok) return <LoansLoadError what="holdings" reference={list.reference} />;
  const { header, groups, holdings, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(holdingsUrl({ ...state, page: totalPages - 1 }));
  }
  const portfolioGroups = whole?.groups ?? groups;

  // Top movers look at every holding of the filter, not only the page on screen.
  const scan =
    totalPages > 1
      ? ((await orNull(fetchHoldings({ ...query, sort: 'name', page: 0, size: MOVERS_SCAN })))?.holdings ?? holdings)
      : holdings;
  const movers = topMovers(scan);
  const allocation = allocationModel(portfolioGroups);
  const counts = Object.fromEntries(portfolioGroups.map((g) => [g.assetType, g.count]));
  const hero = heroModel(header);

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <HoldingsHero hero={hero} />
      <PricesLine asOf={hero.priceAsOf} latestJobId={latestJobId} />
      <HoldingsTiles tiles={holdingsTiles(header, groups.reduce((n, g) => n + g.count, 0), tax)} failedLabels={TILE_LABELS} />
      <HoldingsListCard
        state={state}
        rows={holdings}
        groups={groups}
        totalElements={totalElements}
        totalPages={totalPages}
        brokers={(brokers ?? []).map((b) => ({ id: b.id, name: b.name }))}
        counts={counts}
      />
      <div className="grid grid-cols-1 desk:grid-cols-3 items-start gap-space-12 desk:gap-space-16">
        {allocation.length > 0 ? <AllocationCard segments={allocation} /> : null}
        {tax ? (
          <div className="desk:order-3">
            <TaxCard model={taxCardModel(tax)} />
          </div>
        ) : null}
        {movers.length > 0 ? (
          <div className="desk:order-2">
            <TopMoversCard movers={movers} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
