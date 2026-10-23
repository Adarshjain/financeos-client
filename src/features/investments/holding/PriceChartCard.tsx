'use client';

import React from 'react';

import { Card, EmptyState, SegmentedControl } from '@/components/ds';
// owner 2026-10-23: the reports chart until it moves to organisms
import { ChartView } from '@/components/reports/views/ChartView';
import type { PriceHistoryPoint } from '@/lib/types';

import { CHART_RANGES, type ChartRange, priceChartData, pricesInRange, RANGE_TITLES } from './priceChart';

// The Dinero scale has no chart-height step (h-72 is dropped), so the frame takes the chart's height from its width.
/** "Price · 1 year": the daily close over a range, from the stored price history. */
export function PriceChartCard({ history }: { history: PriceHistoryPoint[] }) {
  const [range, setRange] = React.useState<ChartRange>('1y');
  const points = React.useMemo(() => pricesInRange(history, range), [history, range]);
  return (
    <Card
      title={`Price · ${RANGE_TITLES[range]}`}
      subtitle="Daily close"
      action={<SegmentedControl options={CHART_RANGES} value={range} onValueChange={setRange} aria-label="Range" />}
    >
      <div className="px-space-16 pb-space-16">
        {points.length < 2 ? (
          <EmptyState compact description="Not enough prices to draw a chart yet." />
        ) : (
          <div className="aspect-video">
            <ChartView data={priceChartData(points)} fill />
          </div>
        )}
      </div>
    </Card>
  );
}
