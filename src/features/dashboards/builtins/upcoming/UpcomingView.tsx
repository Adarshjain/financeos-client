'use client';

// upcoming (template TABLE over the obligations datasource: dueDate, kind, title, amount, soonest first): one row
// per bill, EMI, expected statement or lending return, with its date tile, kind (the subtitle) and amount.

import React from 'react';

import { DateTile } from '@/components/ds/DateTile/DateTile';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { cellText } from '@/features/dashboards/builtins/builtinModel';
import { formatCell } from '@/features/reports/view/cellsModel';
import { isRawTableData } from '@/lib/reports.helpers';
import type { TableRow } from '@/lib/reports.types';

import { BuiltinNote, BuiltinPager } from '../BuiltinParts';
import type { TemplateViewProps } from '../types';
import { upcomingKindLabel } from './upcomingModel';

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** The date tile's day and month from a YYYY-MM-DD due date; null when there is none. */
export function dueTile(row: TableRow): { day: number; monthLabel: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(cellText(row, 'dueDate'));
  return m ? { day: Number(m[3]), monthLabel: MONTH_SHORT[Number(m[2]) - 1] } : null;
}

export function UpcomingView({ data, loading, onPageChange }: TemplateViewProps) {
  if (!isRawTableData(data)) return <BuiltinNote>This widget can&apos;t show this data.</BuiltinNote>;
  if (data.rows.length === 0) {
    return <EmptyState compact description="No rows match" />;
  }
  const amountColumn = data.columns.find((c) => c.key === 'amount');
  const kindColumn = data.columns.find((c) => c.key === 'kind');
  return (
    <div data-testid="upcoming-view" aria-busy={loading || undefined}>
      {data.rows.map((row, i) => {
        const tile = dueTile(row);
        const amount = amountColumn && row.amount != null && row.amount !== '' ? formatCell(row.amount, amountColumn) : null;
        return (
          <ListRow
            key={String(row.id ?? i)}
            data-testid="upcoming-row"
            className="gap-space-8 py-space-8"
            leading={
              tile ? (
                <DateTile day={tile.day} monthLabel={tile.monthLabel} />
              ) : (
                <Text tone="ink-4" align="center" className="w-10 shrink-0">
                  —
                </Text>
              )
            }
            title={cellText(row, 'title')}
            subtitle={upcomingKindLabel(row, kindColumn) ?? undefined}
            trailing={
              amount ? (
                <Text variant="body-strong" fraction="small">
                  {amount}
                </Text>
              ) : null
            }
          />
        );
      })}
      <BuiltinPager page={data.page} unit="row" onPageChange={onPageChange} />
    </div>
  );
}
