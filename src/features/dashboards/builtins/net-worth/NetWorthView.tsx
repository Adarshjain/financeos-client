'use client';

// net_worth (template KPI over the net_worth datasource): the figure, and its change against the compared
// period, then the Cash · Invested · Cards · Loans line (an ad-hoc report beside the KPI). The figure opens the
// underlying data (how each account adds up) when the frame offers it.

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Text } from '@/components/ds/Text/Text';
import { BuiltinNote } from '@/features/dashboards/builtins/BuiltinParts';
import type { TemplateViewProps } from '@/features/dashboards/builtins/types';
import { formatMeasure } from '@/features/reports/measureFormatModel';
import { formatComparedRange } from '@/lib/date-range';
import { formatMoney, formatPercent } from '@/lib/format';
import { isKpiData } from '@/lib/reports.helpers';
import { signed } from '@/lib/reports/signed';

import { useNetWorthParts } from './useNetWorthParts';

const DELTA_TONE = { good: 'positive', bad: 'danger', neutral: 'ink-3' } as const;

export function NetWorthView({ data, loading, onKpiValueClick }: TemplateViewProps) {
  const { data: parts } = useNetWorthParts();
  if (!isKpiData(data)) return <BuiltinNote>This widget can&apos;t show this data.</BuiltinNote>;
  const fmt = (n: number | null) =>
    formatMeasure(n, {
      field: data.measure,
      aggregation: data.aggregation,
      format: data.format ?? undefined,
      money: true,
      wholeRupees: true,
    });
  const c = data.comparison;
  const percent = c?.changePercent != null ? ` (${formatPercent(c.changePercent, { sign: 'always' })})` : '';
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
              {part.label} <strong>{formatMoney(Math.abs(part.value), { compact: 'k' })}</strong>
            </Text>
          ))}
        </div>
      ) : null}
    </div>
  );
}
