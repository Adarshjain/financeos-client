'use client';

// cap_headroom (view `cap_list`): reward caps in their current window, most used first — amber from 80%,
// red with "Cap hit" at 100% — each linking to its card on the Rewards page.

import React from 'react';

import { EmptyState, Text } from '@/components/ds';
import { BarRow, type BarRowTone, BuiltinNote, BuiltinPager } from '@/features/dashboards/builtins/BuiltinParts';
import type { TemplateViewProps } from '@/features/dashboards/builtins/types';
import { appHref } from '@/features/shell/routes';
import { formatCount, formatDate, formatMoney, formatPercent } from '@/lib/format';
import { isRawTableData } from '@/lib/reports.helpers';

import { type CapItem, capItems, type CapTone } from './capHeadroomModel';

const BAR: Record<CapTone, BarRowTone> = { neutral: 'brand', near: 'warning', hit: 'danger' };
const TEXT = { neutral: 'ink', near: 'warning', hit: 'danger' } as const;

function inUnit(value: number, unit: string): string {
  return unit === 'POINTS' ? formatCount(value, 'pts') : formatMoney(value);
}

function caption(it: CapItem): string {
  return `${inUnit(it.used, it.unit)} of ${inUnit(it.limit, it.unit)}${it.windowEnd ? ` · resets after ${formatDate(it.windowEnd, 'list')}` : ''}`;
}

export function CapHeadroomView({ data, loading, onPageChange }: TemplateViewProps) {
  if (!isRawTableData(data)) return <BuiltinNote>This widget can&apos;t show this data.</BuiltinNote>;
  const items = capItems(data);
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        title="No reward caps this cycle"
        description="Caps on your cards' reward rules show up here as you spend."
      />
    );
  }
  return (
    <div data-testid="cap-headroom-view" aria-busy={loading || undefined}>
      {items.map((it) => (
        <BarRow
          key={it.id}
          data-testid="cap-row"
          data-tone={it.tone}
          href={appHref(`/rewards?account=${encodeURIComponent(it.cardId)}`)}
          title={
            <>
              {it.card}
              <Text tone="ink-3">
                {' '}
                · {it.cap}
                {it.cardholder ? ` · ${it.cardholder}` : ''}
              </Text>
            </>
          }
          trailing={
            <Text variant="body-strong" tone={TEXT[it.tone]}>
              {it.tone === 'hit' ? 'Cap hit' : formatPercent(Math.floor(it.pct ?? 0), { decimals: 0 })}
            </Text>
          }
          value={it.pct ?? 0}
          tone={BAR[it.tone]}
          caption={caption(it)}
        />
      ))}
      <BuiltinPager page={data.page} unit="cap" onPageChange={onPageChange} />
    </div>
  );
}
