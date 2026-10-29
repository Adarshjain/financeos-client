'use client';

import React from 'react';

import { Button, Card, EmptyState, Icon, SegmentedControl } from '@/components/ds';
import { Chart } from '@/components/organisms/Chart/Chart';
import type { PriceHistoryPoint } from '@/lib/types';

import { adjustForSplits, CHART_RANGES, type ChartRange, priceChartData, pricesInRange, type PriceSplit, RANGE_TITLES } from './priceChart';

// The Dinero scale has no chart-height step (h-72 is dropped), so the frame takes the chart's height from its width: 16:9 on the phone, 21:9 on desktop.
/** "Price · 1 year": the daily close over a range, from the stored price history. */
export function PriceChartCard({ history, splits = [], onOpenHistory }: { history: PriceHistoryPoint[] | null; splits?: PriceSplit[]; onOpenHistory: () => void }) {
  const [range, setRange] = React.useState<ChartRange>('1y');
  const points = React.useMemo(() => pricesInRange(adjustForSplits(history ?? [], splits), range), [history, splits, range]);
  return (
    <Card
      title={`Price · ${RANGE_TITLES[range]}`}
      subtitle="Daily close"
      action={
        <span className="flex items-center gap-space-8">
          <SegmentedControl options={CHART_RANGES} value={range} onValueChange={setRange} aria-label="Range" />
          <Button variant="ghost" size="sm" iconOnly aria-label="Price history" onClick={onOpenHistory}>
            <Icon name="clock-counter-clockwise" size="sm" />
          </Button>
        </span>
      }
    >
      <div className="px-space-16 pb-space-16">
        {history === null ? (
          <EmptyState compact description="Couldn't load the price chart." />
        ) : points.length < 2 ? (
          <EmptyState compact description="Not enough prices to draw a chart yet." />
        ) : (
          <div className="aspect-video desk:aspect-wide">
            <Chart data={priceChartData(points)} fill yDomain="data" />
          </div>
        )}
      </div>
    </Card>
  );
}
