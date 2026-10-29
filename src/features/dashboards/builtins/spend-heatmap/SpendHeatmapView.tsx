'use client';

// spend_heatmap (template CHART over daily spend): the Chart organism's calendar heatmap — weeks as columns,
// Monday to Sunday down, darker on heavier days, today outlined. A day with spend opens its transactions
// ("View underlying data"), as in Legacy.

import React from 'react';

import { EmptyState } from '@/components/ds';
import { Chart } from '@/components/organisms';
import { heatmapMonths, spendByDay } from '@/components/organisms/Chart/heatmap.model';
import { BuiltinNote } from '@/features/dashboards/builtins/BuiltinParts';
import type { TemplateViewProps } from '@/features/dashboards/builtins/types';
import { LazyReportUnderlyingDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import { widgetParams } from '@/lib/dashboards.helpers';
import { formatDate, formatMoney } from '@/lib/format';
import { isChartData } from '@/lib/reports.helpers';

import { daySpendRequest } from './heatmap.requests';

export function SpendHeatmapView({ widget, data, loading }: TemplateViewProps) {
  const [day, setDay] = React.useState<{ date: string; amount: number } | null>(null);
  const hasSpend = React.useMemo(
    () => (isChartData(data) ? [...spendByDay(data).values()].some((v) => v > 0) : false),
    [data],
  );

  if (!isChartData(data)) return <BuiltinNote>This widget can&apos;t show this data.</BuiltinNote>;
  if (!hasSpend) {
    return (
      <EmptyState
        compact
        title="No spending in this period"
        description="Debits on your accounts fill in the calendar day by day."
      />
    );
  }
  return (
    <div data-testid="spend-heatmap-view" aria-busy={loading || undefined}>
      <Chart
        money
        months={heatmapMonths(widgetParams(widget))}
        data={{ ...data, chartType: 'heatmap' }}
        onSelectEntry={(entry) => setDay({ date: entry.key, amount: entry.value })}
      />
      {day ? (
        <LazyReportUnderlyingDialog
          request={daySpendRequest(day.date)}
          title={`Spending on ${formatDate(day.date, 'input')} · ${formatMoney(day.amount)}`}
          onClose={() => setDay(null)}
        />
      ) : null}
    </div>
  );
}
