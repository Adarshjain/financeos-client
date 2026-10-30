'use client';

// The allocation template view: a donut of open holdings' current value by asset class with its legend (class,
// share, ₹), drawn by the Chart organism. A slice or its legend row opens that class's holdings, as in Legacy.
// Content only; the dashboard frame draws the card.

import React from 'react';

import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { LazyReportUnderlyingDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import { formatMoney } from '@/lib/format';
import { LazyChart as Chart } from '@/lib/lazy/LazyChart';
import type { ChartData } from '@/lib/reports.types';

import { positionsValueRequest } from '../investmentsLoansData';
import type { TemplateViewProps } from '../types';
import { allocationDonut, sliceFilter, sliceKeyOf } from './allocationData';

/** The widget's loading skeleton: a ring beside three legend rows. */
export function AllocationSkeleton() {
  return (
    <div className="flex items-center gap-space-16 px-space-16 pb-space-12" data-testid="allocation-loading">
      <Skeleton circle width={96} />
      <div className="flex min-w-0 flex-1 flex-col gap-space-8">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function AllocationView({ data }: TemplateViewProps) {
  const donut = React.useMemo(() => (data.type === 'CHART' ? allocationDonut(data as ChartData) : null), [data]);
  const [opened, setOpened] = React.useState<{ key: string; label: string; value: number } | null>(null);
  if (!donut) return <EmptyState compact description="No open holdings to split yet" />;
  return (
    <div className="px-space-16 pb-space-12" data-testid="allocation-view">
      <Chart
        data={donut}
        money
        onSelectEntry={(entry) => {
          const key = sliceKeyOf(data as ChartData, entry.key);
          if (key) setOpened({ key, label: entry.label, value: entry.value });
        }}
      />
      {opened ? (
        <LazyReportUnderlyingDialog
          request={positionsValueRequest([sliceFilter(opened.key)])}
          title={`${opened.label} holdings · ${formatMoney(opened.value)}`}
          onClose={() => setOpened(null)}
        />
      ) : null}
    </div>
  );
}
