'use client';

import React, { useMemo } from 'react';

import { createDataTableColumnHelper, DataTable, Text } from '@/components/ds';
import { dayMonth } from '@/features/jobs/format';
import type { PriceRefreshItem, PriceRefreshResult as PriceRefreshData } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

import { ResultSection } from './ResultSection';

const ch = createDataTableColumnHelper<PriceRefreshItem>();
const columns = [
  ch.display({
    id: 'instrument',
    header: 'Instrument',
    meta: { size: 'fill', phone: 'main' },
    cell: ({ row }) => (
      <Text variant="body" truncate>
        {row.original.instrumentName || row.original.instrumentId}
      </Text>
    ),
  }),
  ch.display({
    id: 'date',
    header: 'Price date',
    meta: { size: 'sm', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {dayMonth(row.original.priceDate)}
      </Text>
    ),
  }),
  ch.display({
    id: 'source',
    header: 'Source',
    meta: { size: 'sm', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {row.original.source}
      </Text>
    ),
  }),
  ch.display({
    id: 'close',
    header: 'Close',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
    cell: ({ row }) => <Text variant="body">{formatCurrency(row.original.close)}</Text>,
  }),
];

/** Price refresh result: the count line, then failed, skipped and updated instruments with their reasons. */
export function PriceRefreshResult({ result }: { result: PriceRefreshData }) {
  const refreshed = result.refreshed ?? 0;
  const skipped = result.skipped ?? 0;
  const asOf = result.asOf ? dayMonth(String(result.asOf)) : 'today';
  const failed = useMemo(() => (Array.isArray(result.failed) ? result.failed : []), [result.failed]);
  const updated = useMemo(() => result.refreshedItems ?? [], [result.refreshedItems]);
  const skippedItems = result.skippedItems ?? [];

  return (
    <div className="flex flex-col gap-space-8" data-testid="price-refresh-result">
      <Text variant="body-strong" as="p">
        Updated {refreshed} price{refreshed === 1 ? '' : 's'} (as of {asOf}); {skipped} skipped
        {failed.length > 0 ? `; ${failed.length} failed` : ''}.
      </Text>

      <ResultSection title="Failed" count={failed.length} defaultOpen tone="danger">
        {failed.map((f, i) => (
          <Text key={f.instrumentId ?? i} variant="body" as="p">
            <strong>{f.instrumentName || f.instrumentId}</strong>: {f.reason}
          </Text>
        ))}
      </ResultSection>

      <ResultSection title="Skipped" count={skippedItems.length}>
        {skippedItems.map((s) => (
          <Text key={s.instrumentId} variant="body" as="p">
            <strong>{s.instrumentName || s.instrumentId}</strong>: {s.reason}
          </Text>
        ))}
      </ResultSection>

      <ResultSection title="Updated" count={updated.length}>
        <DataTable
          columns={columns}
          data={updated}
          getRowId={(u) => u.instrumentId}
          phoneSub={(u) => `${dayMonth(u.priceDate)} · ${u.source}`}
          stickyHeader={false}
        />
      </ResultSection>
    </div>
  );
}
