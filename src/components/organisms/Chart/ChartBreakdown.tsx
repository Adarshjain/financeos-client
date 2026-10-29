'use client';

import React from 'react';

import { Button, createDataTableColumnHelper, DataTable, ProgressBar, type ProgressBarColor, Text } from '@/components/ds';
import { formatMeasure } from '@/features/reports/measureFormat';
import { formatCount, formatPercent } from '@/lib/format';
import { labelChartData, valueLabel } from '@/lib/reports.helpers';
import type { BreakdownBars, BreakdownColumn, BreakdownSubRow } from '@/lib/reports.types';

import type { ChartInput } from './Chart';


export interface ChartBreakdownProps {
  data: ChartInput;
  /** Whether the measure is money; omitted, its name decides. */
  money?: boolean;
  /** The definition's value columns; absent = amount, share, and change when the data compares. */
  columns?: BreakdownColumn[];
  /** What the bars are relative to; absent = the largest row. */
  bars?: BreakdownBars;
  /** The comparison's `higherIsBetter`: an increase reads good when true, bad when false, neutral when unset. */
  higherIsBetter?: boolean;
  /** The heading of the label column (the rows' dimension); default "Category". */
  rowsLabel?: string;
  /** A press on row `index` (the index into `data.categories`) opens its underlying data. */
  onOpenRow?: (index: number) => void;
  /** Whether row `index` can open underlying data; without it every row can. */
  canOpenRow?: (index: number) => boolean;
}

interface Row {
  id: string;
  index: number;
  label: string;
  isOther: boolean;
  value: number | null;
  count: number | null;
  avg: number | null;
  /** Percent of the total, null when there is no total (or it is zero). */
  share: number | null;
  /** Percent change against the previous period, null when the row has no previous value. */
  change: number | null;
  /** Bar fill, 0 to 100. */
  bar: number;
  /** The bar's chart colour: chart-1…chart-5 by rank, chart-rest for the Other row. */
  color: ProgressBarColor;
  subRows: BreakdownSubRow[];
}

const ch = createDataTableColumnHelper<Row>();

const DEFAULT_COLUMNS: BreakdownColumn[] = ['amount', 'share', 'change'];
const ORDER: BreakdownColumn[] = ['amount', 'share', 'count', 'avg', 'change'];
const HEADERS: Record<BreakdownColumn, string> = { amount: 'Amount', share: 'Share', count: 'Txns', avg: 'Avg', change: 'vs prev' };

const txns = (n: number) => formatCount(n, ['transaction', 'transactions']);
const percent = (n: number) => formatPercent(n, { decimals: 0 });
const SERIES: ProgressBarColor[] = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];
const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function ChartBreakdown({ data, money, columns: wanted, bars, higherIsBetter, rowsLabel, onOpenRow, canOpenRow }: ChartBreakdownProps) {
  const labelled = labelChartData(data);
  const field = data.measure?.field;
  const aggregation = data.measure?.aggregation;
  const values = labelled.series[0]?.data ?? [];
  const previous = data.previous?.series[0]?.data;
  const total = data.breakdown?.total ?? null;
  const otherIndex = data.other?.index;
  const biggest = Math.max(0, ...values.filter((v, i): v is number => v !== null && i !== otherIndex));
  const comparing = !!previous;

  const rows = React.useMemo<Row[]>(() => {
    let rank = 0;
    return labelled.categories.map((category, index) => {
      const isOther = index === otherIndex;
      if (!isOther) rank += 1;
      const value = values[index] ?? null;
      const prev = previous?.[index] ?? null;
      const detail = data.breakdown?.rows[index];
      const denominator = bars === 'share_of_total' && total ? total : biggest;
      return {
        id: String(index),
        index,
        label: isOther
          ? `Other · ${formatCount(data.other?.foldedCount ?? 0, ['category', 'categories'])}`
          : category,
        isOther,
        value,
        count: detail?.count ?? null,
        avg: detail?.avg ?? null,
        share: value !== null && total ? (value / total) * 100 : null,
        change: value !== null && prev !== null && prev !== 0 ? ((value - prev) / Math.abs(prev)) * 100 : null,
        bar: value !== null && denominator ? clamp((value / denominator) * 100) : 0,
        color: isOther ? 'chart-rest' : SERIES[(rank - 1) % SERIES.length],
        subRows: isOther ? [] : (detail?.subRows ?? []),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, bars]);

  const shown = React.useMemo(() => {
    const asked = wanted && wanted.length > 0 ? wanted : DEFAULT_COLUMNS;
    return ORDER.filter((c) => asked.includes(c) && !(c === 'share' && !total) && !(c === 'change' && !comparing));
  }, [wanted, total, comparing]);

  const fmt = (v: number | null | undefined) => formatMeasure(v, { field, aggregation, money, wholeRupees: true });
  // An average is never a count, even for a count measure.
  const fmtAvg = (v: number | null | undefined) => formatMeasure(v, { field, money, wholeRupees: true });

  const changeTone = (change: number | null): 'positive' | 'danger' | 'ink-3' => {
    if (change === null || Math.round(change) === 0 || higherIsBetter === undefined) return 'ink-3';
    return change > 0 === higherIsBetter ? 'positive' : 'danger';
  };
  const changeText = (change: number | null) => (change === null ? '—' : formatPercent(change, { sign: 'always', decimals: 0 }));

  const tableColumns = React.useMemo(
    () => [
      ch.display({
        id: 'label',
        header: rowsLabel ?? 'Category',
        meta: { size: 'fill', phone: 'main' },
        cell: ({ row }) => (
          <div className="flex flex-col gap-space-4 min-w-0">
            <Text variant="body-strong" tone={row.original.isOther ? 'ink-2' : 'ink'} truncate>
              {row.original.label}
            </Text>
            <ProgressBar value={row.original.bar} color={row.original.color} />
          </div>
        ),
      }),
      ...shown.map((column) =>
        ch.display({
          id: column,
          header: HEADERS[column],
          meta: { size: column === 'amount' || column === 'avg' ? 'md' : 'sm', align: 'end', phone: column === 'amount' ? 'amount' : 'hidden' },
          cell: ({ row }) => {
            const r = row.original;
            switch (column) {
              case 'amount':
                return <Text variant="body-strong">{fmt(r.value)}</Text>;
              case 'share':
                return <Text variant="body" tone="ink-2">{r.share === null ? '—' : percent(r.share)}</Text>;
              case 'count':
                return <Text variant="body" tone="ink-2">{r.count === null ? '—' : String(r.count)}</Text>;
              case 'avg':
                return <Text variant="body" tone="ink-2">{fmtAvg(r.avg)}</Text>;
              default:
                return <Text variant="body-strong" tone={changeTone(r.change)}>{changeText(r.change)}</Text>;
            }
          },
        }),
      ),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, rowsLabel, field, aggregation, money, higherIsBetter],
  );

  const openable = (row: Row) => !!onOpenRow && !row.isOther && (canOpenRow ? canOpenRow(row.index) : true);
  const hasSubRows = rows.some((r) => r.subRows.length > 0);
  const subLabels = data.subValueLabels;

  const phoneSub = (row: Row) => {
    const parts = shown.filter((c) => c !== 'amount' && !(c === 'change' && row.change === null));
    if (parts.length === 0) return null;
    return (
      <>
        {parts.map((c, i) => (
          <React.Fragment key={c}>
            {i > 0 ? ' · ' : null}
            {c === 'share' ? (row.share === null ? '—' : percent(row.share)) : null}
            {c === 'count' ? txns(row.count ?? 0) : null}
            {c === 'avg' ? `avg ${fmtAvg(row.avg)}` : null}
            {c === 'change' ? <Text variant="caption" tone={changeTone(row.change)}>{changeText(row.change)}</Text> : null}
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <DataTable
      columns={tableColumns}
      data={rows}
      getRowId={(row) => row.id}
      onRowSelect={onOpenRow ? (row) => onOpenRow(row.index) : undefined}
      // A row with sub-rows expands on a press (its underlying data opens from the link inside); the Other row and a
      // row that cannot open anything are not pressable.
      rowState={(row) => ({ pressable: row.subRows.length === 0 && openable(row) })}
      getRowCanExpand={(row) => row.subRows.length > 0}
      renderExpanded={(row) => (
        <div className="flex flex-col gap-space-4 px-space-14 py-space-10">
          {row.subRows.map((sub, i) => (
            <div key={i} className="flex items-baseline justify-between gap-space-12">
              <Text variant="caption" tone="ink-2" truncate>
                {`${valueLabel(sub.label, subLabels)} · ${txns(sub.count)}`}
              </Text>
              <Text variant="caption" tone="ink-2">
                {fmt(sub.value)}
              </Text>
            </div>
          ))}
          {openable(row) ? (
            <div className="flex justify-end">
              <Text variant="label" as="span">
                <Button size="sm" variant="link" onClick={() => onOpenRow?.(row.index)}>
                  Underlying data
                </Button>
              </Text>
            </div>
          ) : null}
        </div>
      )}
      phoneSub={phoneSub}
      footer={
        hasSubRows || total !== null ? (
          <div className="flex items-baseline justify-between gap-space-12 px-space-14 py-space-10">
            <Text variant="caption" tone="ink-3">
              {hasSubRows ? 'Tap a row to expand it' : ''}
            </Text>
            {total !== null ? (
              <Text variant="caption" tone="ink-3">
                {`Total ${fmt(total)}`}
              </Text>
            ) : null}
          </div>
        ) : undefined
      }
      stickyHeader={false}
    />
  );
}
