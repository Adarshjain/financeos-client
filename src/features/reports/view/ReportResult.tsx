'use client';

import type { ColumnDef } from '@tanstack/react-table';
import React from 'react';

import { createDataTableColumnHelper, DataTable, type DataTableFeatures, EmptyState, KpiTile, Pager, Text } from '@/components/ds';
import { Chart } from '@/components/organisms/Chart/Chart';
import { AGGREGATION_LABELS } from '@/features/reports/builder/labels';
import { formatComparedRange, formatDateRange } from '@/lib/date-range';
import { isChartData, isKpiData, isPivotTableData, isRawTableData, valueLabel } from '@/lib/reports.helpers';
import type {
  ChartData,
  ChartDefinition,
  DatasourceCatalog,
  KpiData,
  PivotTableData,
  ReportData,
  SortClause,
  TableColumn,
  TableData,
} from '@/lib/reports.types';
import { formatMeasureValue } from '@/lib/reports/formatMeasureValue';
import { signed } from '@/lib/reports/signed';

import { formatCell } from './cells';
import { PAGE_SIZES } from './format';

/** A raw table cell as the preview prints it: numbers as {@link previewValue}, everything else as the table does. */
function cellText(value: unknown, column: TableColumn, catalog: DatasourceCatalog | undefined): string {
  if (column.type === 'number' && value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value))) {
    return previewValue(Number(value), { field: column.key, format: column.format }, catalog);
  }
  return formatCell(value, column);
}


export interface ReportResultProps {
  data: ReportData;
  /** The datasource's fields, for labels and number formats; without it field names and plain numbers show. */
  catalog?: DatasourceCatalog;
  /** A page or sort request is running. */
  busy?: boolean;
  /** Tables: the sort the rows were run with (null = the report's own order). */
  sort?: SortClause | null;
  onSortChange?: (sort: SortClause | null) => void;
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
  /** KPI only: the tile's form; 'plain' draws it with no card of its own (a widget already is one). */
  kpiVariant?: React.ComponentProps<typeof KpiTile>['variant'];
  /** Breakdown only: the chart definition the data was run with (its columns, bars and comparison preference). */
  definition?: ChartDefinition;
  /** Breakdown only: a press on row `index`. */
  onOpenBreakdownRow?: (index: number) => void;
  /** Breakdown only: whether row `index` can open its underlying data; without it every row can. */
  canOpenBreakdownRow?: (index: number) => boolean;
  /** Aggregated table only: a press on the row with this `key`. */
  onOpenTableRow?: (key: string) => void;
  /** Aggregated table only: whether the row with this `key` can be opened; without it every row can. */
  canOpenTableRow?: (key: string) => boolean;
}

const fieldOf = (catalog: DatasourceCatalog | undefined, name: string) => catalog?.fields.find((f) => f.name === name);

type Format = 'currency' | 'number' | 'percent';

/** Whether a measure is money: the response's format hint, else what the catalog marks as currency; unknown when neither says. */
function moneyOf(catalog: DatasourceCatalog | undefined, name: string, format?: Format | null): boolean | undefined {
  if (format) return format === 'currency';
  const field = fieldOf(catalog, name);
  return field ? field.format === 'currency' : undefined;
}

/** A value as the preview prints it: whole rupees for money, counts as integers, other numbers to two decimals. */
function previewValue(
  value: number | null | undefined,
  o: { field: string; aggregation?: string; format?: Format | null },
  catalog: DatasourceCatalog | undefined,
): string {
  return formatMeasureValue(value, {
    field: o.field,
    aggregation: o.aggregation,
    format: o.format ?? undefined,
    money: moneyOf(catalog, o.field, o.format),
    wholeRupees: true,
  });
}

// ---- KPI -------------------------------------------------------------------

function KpiResult({ data, catalog, variant }: { data: KpiData; catalog?: DatasourceCatalog; variant?: React.ComponentProps<typeof KpiTile>['variant'] }) {
  const format = data.format ?? fieldOf(catalog, data.measure)?.format ?? null;
  const fmt = (n: number | null) => previewValue(n, { field: data.measure, aggregation: data.aggregation, format }, catalog);
  const label = `${fieldOf(catalog, data.measure)?.label ?? data.measure} · ${AGGREGATION_LABELS[data.aggregation].toLowerCase()}`;
  const range = data.meta.dateRange;
  const c = data.comparison;
  let delta: React.ComponentProps<typeof KpiTile>['delta'];
  if (c) {
    const period = formatComparedRange(c.previousDateRange, range);
    if (c.display === 'previous_value') {
      delta = { value: `prev ${fmt(c.previousValue)}`, period, direction: c.sentiment };
    } else {
      const percent = c.changePercent !== null ? ` (${signed(`${c.changePercent.toFixed(1)}%`, c.changePercent)})` : '';
      delta = { value: `${signed(fmt(c.change), c.change)}${percent}`, period, direction: c.sentiment };
    }
  }
  return (
    <KpiTile
      variant={variant}
      label={label}
      value={fmt(data.value)}
      delta={delta}
      context={range ? formatDateRange(range.from, range.to) : undefined}
    />
  );
}

// ---- Tables ----------------------------------------------------------------

type Row = Record<string, unknown> & { __row: string };
const ch = createDataTableColumnHelper<Row>();
type Columns = ColumnDef<DataTableFeatures, Row, unknown>[];

function tablePager(
  page: { number: number; size: number; totalElements: number; totalPages: number },
  onPageChange?: (page: number) => void,
  onSizeChange?: (size: number) => void,
) {
  return (
    <Pager
      variant="compact"
      page={page.number}
      size={page.size}
      totalElements={page.totalElements}
      totalPages={page.totalPages}
      unit="rows"
      sizeOptions={PAGE_SIZES.includes(page.size) ? PAGE_SIZES : [...PAGE_SIZES, page.size].sort((a, b) => a - b)}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(p) => onPageChange?.(p)}
      onSizeChange={onSizeChange}
    />
  );
}

const toSort = (s: { id: string; desc: boolean } | null): SortClause | null => (s ? { key: s.id, direction: s.desc ? 'desc' : 'asc' } : null);
const fromSort = (s: SortClause | null | undefined) => (s ? { id: s.key, desc: s.direction === 'desc' } : null);

function RawTableResult({ data, catalog, busy, sort, onSortChange, onPageChange, onSizeChange }: ReportResultProps & { data: TableData }) {
  const { columns: cols, rows: raw, page } = data;
  const rows = React.useMemo<Row[]>(() => raw.map((r, i) => ({ ...r, __row: String(r.id ?? `${page.number}-${i}`) })), [raw, page.number]);
  const firstNumber = cols.findIndex((c) => c.type === 'number');
  const columns = React.useMemo<Columns>(
    () =>
      cols.map((c, i) =>
        ch.accessor((row: Row) => row[c.key] as unknown, {
          id: c.key,
          header: c.label,
          meta: {
            size: i === 0 ? 'fill' : 'md',
            grow: i === 0 ? 2 : undefined,
            align: c.type === 'number' ? 'end' : 'start',
            sortable: !!onSortChange,
            phone: i === 0 ? 'main' : i === firstNumber ? 'amount' : 'hidden',
          },
          cell: ({ row }) => (
            <Text variant={i === 0 ? 'body-strong' : 'body'} truncate>
              {cellText(row.original[c.key], c, catalog)}
            </Text>
          ),
        }),
      ),
    [cols, firstNumber, onSortChange, catalog],
  );
  const phoneSub = (row: Row) =>
    cols
      .filter((c, i) => i !== 0 && i !== firstNumber)
      .map((c) => cellText(row[c.key], c, catalog))
      .filter((t) => t !== '—')
      .join(' · ');
  const pager = tablePager(page, onPageChange, onSizeChange);
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.__row}
      sort={fromSort(sort)}
      onSortChange={(s) => onSortChange?.(toSort(s))}
      sortMode="server"
      busy={busy}
      pager={pager}
      phoneSub={phoneSub}
      empty={<EmptyState compact description="No rows match." />}
      stickyHeader={false}
    />
  );
}

function PivotTableResult({ data, catalog, busy, sort, onSortChange, onPageChange, onSizeChange, onOpenTableRow, canOpenTableRow }: ReportResultProps & { data: PivotTableData }) {
  const { rowDimensions, columnDimensions, measures, columns: pivotColumns, rows: raw, page } = data;
  const hasColumnDims = columnDimensions.length > 0;
  const rows = React.useMemo<Row[]>(() => raw.map((r) => ({ ...r, __row: r.key })) as unknown as Row[], [raw]);
  const columns = React.useMemo<Columns>(() => {
    const dims: Columns = rowDimensions.map((d, i) =>
      ch.accessor((row: Row) => (row.values as Record<string, string>)[d.field] as unknown, {
        id: d.field,
        header: d.label,
        meta: { size: i === 0 ? 'fill' : 'md', grow: i === 0 ? 2 : undefined, sortable: !!onSortChange, phone: i === 0 ? 'main' : 'hidden' },
        cell: ({ row }) => {
          const values = row.original.values as Record<string, string>;
          const v = values[d.field];
          return (
            <Text variant={i === 0 ? 'body-strong' : 'body'} truncate>
              {v === undefined || v === null || v === '' ? '—' : valueLabel(v, d.valueLabels)}
            </Text>
          );
        },
      }),
    );
    const cells: Columns = pivotColumns.flatMap((pc, ci) =>
      measures.map((m, mi) => {
        const colLabel = columnDimensions
          .map((cd) => {
            const v = pc.values[cd.field];
            return v === undefined || v === null || v === '' ? '' : valueLabel(v, cd.valueLabels);
          })
          .filter(Boolean)
          .join(' · ');
        const header = hasColumnDims ? (measures.length > 1 ? `${colLabel} · ${m.label}` : colLabel) : m.label;
        // The server sorts measures only when there are no column dimensions.
        return ch.accessor((row: Row) => (row.cells as Record<string, Record<string, number>>)[pc.key]?.[m.key] as unknown, {
          id: hasColumnDims ? `${pc.key}|${m.key}` : m.key,
          header,
          meta: {
            size: 'md',
            align: 'end',
            sortable: !!onSortChange && !hasColumnDims,
            phone: ci === 0 && mi === 0 ? 'amount' : 'hidden',
          },
          cell: ({ row }) => {
            const all = row.original.cells as Record<string, Record<string, number>>;
            const v = all[pc.key]?.[m.key];
            return <Text variant="body">{v === undefined ? '' : previewValue(v, { field: m.field, aggregation: m.aggregation, format: m.format }, catalog)}</Text>;
          },
        });
      }),
    );
    return [...dims, ...cells];
  }, [rowDimensions, columnDimensions, measures, pivotColumns, hasColumnDims, onSortChange, catalog]);
  const pager = tablePager(page, onPageChange, onSizeChange);
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.__row}
      sort={fromSort(sort)}
      onSortChange={(s) => onSortChange?.(toSort(s))}
      sortMode="server"
      onRowSelect={onOpenTableRow ? (row) => onOpenTableRow(row.__row) : undefined}
      rowState={canOpenTableRow ? (row) => ({ pressable: canOpenTableRow(row.__row) }) : undefined}
      busy={busy}
      pager={pager}
      empty={<EmptyState compact description="No rows match." />}
      stickyHeader={false}
    />
  );
}

// ---- Chart -----------------------------------------------------------------

function ChartResult({
  data,
  catalog,
  definition,
  onOpenBreakdownRow,
  canOpenBreakdownRow,
}: {
  data: ChartData;
  catalog?: DatasourceCatalog;
  definition?: ChartDefinition;
  onOpenBreakdownRow?: (index: number) => void;
  canOpenBreakdownRow?: (index: number) => boolean;
}) {
  // A count is never money, even a count of an amount field.
  const money = data.measure?.aggregation === 'count' ? false : moneyOf(catalog, data.measure?.field ?? '');
  return (
    <Chart
      data={data}
      money={money}
      columns={definition?.columns}
      bars={definition?.bars}
      higherIsBetter={definition?.comparison?.higherIsBetter}
      rowsLabel={fieldOf(catalog, data.dimension)?.label}
      onOpenRow={onOpenBreakdownRow}
      canOpenRow={canOpenBreakdownRow}
    />
  );
}

/** A report's result as the preview shows it: KPI tile, chart, breakdown list or table, by the data's type. */
export function ReportResult(props: ReportResultProps) {
  const { data, catalog } = props;
  if (isKpiData(data)) return <KpiResult data={data} catalog={catalog} variant={props.kpiVariant} />;
  if (isChartData(data)) {
    return (
      <ChartResult
        data={data}
        catalog={catalog}
        definition={props.definition}
        onOpenBreakdownRow={props.onOpenBreakdownRow}
        canOpenBreakdownRow={props.canOpenBreakdownRow}
      />
    );
  }
  if (isRawTableData(data)) return <RawTableResult {...props} data={data} />;
  if (isPivotTableData(data)) return <PivotTableResult {...props} data={data} />;
  return null;
}
