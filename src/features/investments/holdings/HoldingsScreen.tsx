import React from 'react';

import { GRID_GAP } from '@/components/ds';
import { LivePriceRefresh } from '@/features/investments/LivePriceRefresh';

import { AllocationCard, HoldingsHero, HoldingsTiles, TaxCard, TopMoversCard } from './HoldingsFigures';
import { HoldingsListCard, type HoldingsListCardProps } from './HoldingsListCard';
import type { HoldingsHeroModel, HoldingsTile, Mover, TaxCardModel } from './holdingsModel';
import { PricesLine } from './PricesLine';

const TILE_LABELS = ['Current value', 'Invested', 'Unrealised P&L', 'Realised this FY'];

export interface HoldingsScreenProps extends HoldingsListCardProps {
  hero: HoldingsHeroModel;
  tiles: (HoldingsTile | null)[];
  allocation: React.ComponentProps<typeof AllocationCard>['segments'];
  /** The "Tax this FY" card, or null when the figures could not be read. */
  tax: TaxCardModel | null;
  movers: Mover[];
}

/** Holdings: the hero, figures and list, then allocation, top movers and tax. */
export function HoldingsScreen({ hero, tiles, allocation, tax, movers, ...list }: HoldingsScreenProps) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <LivePriceRefresh />
      <HoldingsHero hero={hero} />
      <PricesLine asOf={hero.priceAsOf} label={hero.priceLine} />
      <HoldingsTiles tiles={tiles} failedLabels={TILE_LABELS} />
      <HoldingsListCard {...list} />
      <div className={`grid grid-cols-1 desk:grid-cols-3 items-start ${GRID_GAP}`}>
        {allocation.length > 0 ? <AllocationCard segments={allocation} /> : null}
        {tax ? (
          <div className="desk:order-3">
            <TaxCard model={tax} />
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
