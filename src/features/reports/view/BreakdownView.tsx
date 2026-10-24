'use client';

import React from 'react';

import { createDataTableColumnHelper, DataTable, Text } from '@/components/ds';
import { formatMeasureValue } from '@/features/reports/formatMeasureValue';
import { labelChartData } from '@/lib/reports.helpers';
import type { ChartData } from '@/lib/reports.types';

/**
 * PLACEHOLDER. A breakdown is a ranked list (rows with a share bar, sub-rows, previous-period change), which
 * another build replaces this file with. Until then it lists the categories and their values in a plain table.
 * The props stay as they are (the data, an optional `money`, and a press on row `index`, the index into `data.categories`).
 */
export interface BreakdownViewProps {
  data: ChartData;
  /** Whether the measure is money; omitted, its name decides. */
  money?: boolean;
  onOpenRow?: (index: number) => void;
}

interface Row {
  id: string;
  index: number;
  category: string;
  value: number | null;
}

const ch = createDataTableColumnHelper<Row>();

export function BreakdownView({ data, money, onOpenRow }: BreakdownViewProps) {
  const labelled = labelChartData(data);
  const field = data.measure?.field;
  const aggregation = data.measure?.aggregation;
  const values = labelled.series[0]?.data ?? [];
  const rows: Row[] = labelled.categories.map((category, index) => ({
    id: String(index),
    index,
    category,
    value: values[index] ?? null,
  }));

  const columns = React.useMemo(
    () => [
      ch.display({
        id: 'category',
        header: 'Category',
        meta: { size: 'fill', grow: 2, phone: 'main' },
        cell: ({ row }) => (
          <Text variant="body-strong" truncate>
            {row.original.category}
          </Text>
        ),
      }),
      ch.display({
        id: 'value',
        header: 'Amount',
        meta: { size: 'md', align: 'end', phone: 'amount' },
        cell: ({ row }) => <Text variant="body">{formatMeasureValue(row.original.value, { field, aggregation, money, wholeRupees: true })}</Text>,
      }),
    ],
    [field, aggregation, money],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      onRowSelect={onOpenRow ? (row) => onOpenRow(row.index) : undefined}
      stickyHeader={false}
    />
  );
}
