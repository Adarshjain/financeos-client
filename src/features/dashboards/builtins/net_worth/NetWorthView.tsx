'use client';

// net_worth (template KPI over the net_worth datasource): the figure, and its change against the compared
// period, then the Cash · Invested · Cards · Loans line (an ad-hoc report beside the KPI). The figure opens the
// underlying data (how each account adds up) when the frame offers it.

import React from 'react';

import { Button, Text } from '@/components/ds';
import { formatCompact } from '@/lib/charts/chart-format';
import { formatComparedRange } from '@/lib/date-range';
import { isKpiData } from '@/lib/reports.helpers';
import { formatMeasureValue } from '@/lib/reports/formatMeasureValue';
import { signed } from '@/lib/reports/signed';

import { BuiltinNote } from '../BuiltinParts';
import type { TemplateViewProps } from '../types';
import { useNetWorthParts } from './useNetWorthParts';

const DELTA_TONE = { good: 'positive', bad: 'danger', neutral: 'ink-3' } as const;

export function NetWorthView({ data, loading, onKpiValueClick }: TemplateViewProps) {
  const { data: parts } = useNetWorthParts();
  if (!isKpiData(data)) return <BuiltinNote>This widget can&apos;t show this data.</BuiltinNote>;
  const fmt = (n: number | null) =>
    formatMeasureValue(n, {
      field: data.measure,
      aggregation: data.aggregation,
      format: data.format ?? undefined,
      money: true,
      wholeRupees: true,
    });
  const c = data.comparison;
  const percent = c?.changePercent != null ? ` (${signed(`${c.changePercent.toFixed(1)}%`, c.changePercent)})` : '';
  const figure = fmt(data.value);
  return (
    <div className="flex flex-col gap-space-4" data-testid="net-worth-view" aria-busy={loading || undefined}>
      <Text variant="figure" as="div" truncate data-testid="net-worth-value">
        {onKpiValueClick ? (
          <Button variant="link" onClick={onKpiValueClick}>
            {figure}
          </Button>
        ) : (
          figure
        )}
      </Text>
      {c ? (
        <Text variant="label" as="div" data-testid="net-worth-delta">
          <Text tone={DELTA_TONE[c.sentiment]}>
            <strong>{`${signed(fmt(c.change), c.change)}${percent}`}</strong>
          </Text>{' '}
          <Text tone="ink-3">{formatComparedRange(c.previousDateRange, data.meta.dateRange)}</Text>
        </Text>
      ) : null}
      {parts ? (
        <div className="flex flex-wrap gap-x-space-12 gap-y-space-2" data-testid="net-worth-parts">
          {parts.map((part) => (
            <Text key={part.key} variant="caption" tone="ink-3" as="span">
              {part.label} <strong>{formatCompact(Math.abs(part.value), true)}</strong>
            </Text>
          ))}
        </div>
      ) : null}
    </div>
  );
}
