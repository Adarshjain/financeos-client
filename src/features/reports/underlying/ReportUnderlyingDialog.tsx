'use client';

// "Underlying data" of the report editor: the rows behind one figure (the whole report's, a chart category's,
// an aggregated-table row's), for this period or the previous one, server-sorted and server-paged with the
// Pager above and below. The request is an ad-hoc KPI definition built by underlyingRequest.ts. A phone gets
// the Dialog's bottom sheet by itself. Period, sort and page are local to one opening.

import React from 'react';

import {
  Banner,
  createDataTableColumnHelper,
  DataTable,
  Dialog,
  DialogBody,
  DialogContent,
  EmptyState,
  FilterChip,
  Pager,
  Select,
  Skeleton,
  Tabs,
  Text,
} from '@/components/ds';
import { formatCell } from '@/features/reports/view/cells';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatDateRange } from '@/lib/date-range';
import { asReportData, isRawTableData } from '@/lib/reports.helpers';
import type { RunReportRequest, SortClause, TableColumn } from '@/lib/reports.types';
import { formatMeasureValue } from '@/lib/reports/formatMeasureValue';

import { asFormat, saveBlob, UNDERLYING_PAGE_SIZE, underlyingCsvFilename } from './underlying.helpers';
import type { UnderlyingExcludedItem, UnderlyingPeriod, UnderlyingSource } from './underlying.types';
import type { UnderlyingEntry } from './underlyingRequest';
import { fetchUnderlyingCsv, useKpiUnderlying } from './useKpiUnderlying';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-13" as "13 Oct"; anything else as it came. */
export function shortDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : value;
}

type Row = Record<string, unknown> & { __row: string };
const ch = createDataTableColumnHelper<Row>();

/** A cell as this table prints it: dates as "13 Oct", everything else as every report table does. */
export function cellText(value: unknown, column: TableColumn): string {
  if (column.type === 'date' && typeof value === 'string' && value !== '') return shortDate(value);
  return formatCell(value, column);
}

/** The column that names the row (the first that is not a date or a number); the first column otherwise. */
export const mainIndexOf = (columns: TableColumn[]) => Math.max(columns.findIndex((c) => c.type !== 'date' && c.type !== 'number'), 0);

/** "Excluded from this figure: Old card (Closed account), …" from what the figure leaves out; null when nothing. */
function excludedLine(items: UnderlyingExcludedItem[]): string | null {
  if (items.length === 0) return null;
  return `Excluded from this figure: ${items.map((i) => `${i.name} (${i.reasonLabel})`).join(', ')}`;
}

/** The report hides excluded transactions with an "is excluded is false" filter like any other. */
function hidesExcluded(request: RunReportRequest): boolean {
  return request.definition.filters.some((f) => f.field === 'isExcluded' && f.operator === 'is' && f.value === false);
}

const ALL_ENTRIES = 'all';
const DEFAULT_SORT = 'default';
const sortValue = (s: SortClause | null) => (s ? `${s.key},${s.direction}` : DEFAULT_SORT);

interface UnderlyingDialogBaseProps {
  /** A chart or breakdown's categories, each with its own request: shown as a dropdown that narrows the rows to one. */
  entries?: UnderlyingEntry[];
  /** The dimension's label: the dropdown's chip reads "<dimension label>: <entry>", its default entry "All". */
  dimensionLabel?: string;
  /** Index into `entries` the dialog opens on (a breakdown row's category); without it, "All". */
  initialEntry?: number;
  /** The dialog's title; without it "Underlying data · <figure>". */
  title?: string;
  onClose: () => void;
}

/** Lists either an ad-hoc KPI request's rows or a built-in template's, never neither. */
export type ReportUnderlyingDialogProps = UnderlyingDialogBaseProps &
  (
    | {
        /** The ad-hoc KPI request whose rows are listed (see underlyingRequest.ts); with `entries`, the whole report's, which "All" returns to. */
        request: RunReportRequest;
        builtin?: undefined;
      }
    | {
        request?: undefined;
        /** A built-in template's source (key + params), listed instead of an ad-hoc `request`. */
        builtin: Extract<UnderlyingSource, { kind: 'builtin' }>;
      }
  );

/** The dialog is open while it is mounted: the page mounts it for one opening and unmounts it on close. */
export function ReportUnderlyingDialog({ request: wholeRequest, builtin, entries, dimensionLabel, initialEntry, title: customTitle, onClose }: ReportUnderlyingDialogProps) {
  // The rows of the whole figure, or of the one category picked in the dropdown (a number as text).
  const [entry, setEntry] = React.useState(() =>
    initialEntry !== undefined && entries?.[initialEntry] ? String(initialEntry) : ALL_ENTRIES,
  );
  const request = entries?.[Number(entry)]?.request ?? wholeRequest;
  const source = React.useMemo<UnderlyingSource>(
    () => (builtin && !request ? builtin : { kind: 'adhoc', request: request! }),
    [builtin, request],
  );
  const [period, setPeriod] = React.useState<UnderlyingPeriod>('current');
  const [sort, setSort] = React.useState<SortClause | null>(null);
  const [page, setPage] = React.useState(0);
  const [downloading, setDownloading] = React.useState(false);
  const [csvError, setCsvError] = React.useState<string | null>(null);

  const query = useKpiUnderlying(source, { period, page, size: UNDERLYING_PAGE_SIZE, sort });
  const shown = query.data;
  // While another period loads, the kept page belongs to the other period: hide it.
  const data = shown && shown.period === period ? shown : null;
  const table = data ? asReportData(data.table) : null;
  const raw = table && isRawTableData(table) ? table : null;

  const columns = React.useMemo(() => {
    if (!raw || !data) return [];
    const mainIndex = mainIndexOf(raw.columns);
    return raw.columns.map((c, i) =>
      ch.accessor((row: Row) => row[c.key] as unknown, {
        id: c.key,
        header: c.label,
        meta: {
          size: c.key === data.measure ? 'md' : c.type === 'date' ? 'sm' : i === mainIndex ? 'fill' : 'md',
          grow: i === mainIndex ? 2 : undefined,
          align: c.type === 'number' ? 'end' : 'start',
          phone: c.key === data.measure ? 'amount' : i === mainIndex ? 'main' : 'hidden',
        },
        cell: ({ row }) => (
          <Text variant={c.key === data.measure ? 'body-strong' : 'body'} truncate>
            {cellText(row.original[c.key], c)}
          </Text>
        ),
      }),
    );
  }, [raw, data]);

  const rows = React.useMemo<Row[]>(
    () => (raw ? raw.rows.map((r, i) => ({ ...r, __row: String(r.id ?? `${raw.page.number}-${i}`) })) : []),
    [raw],
  );

  const phoneSub = (row: Row) => {
    if (!raw || !data) return '';
    const mainIndex = mainIndexOf(raw.columns);
    return raw.columns
      .filter((c, i) => i !== mainIndex && c.key !== data.measure)
      .map((c) => cellText(row[c.key], c))
      .filter((t) => t !== '—')
      .join(' · ');
  };

  const figure = data
    ? formatMeasureValue(data.value, { field: data.measure, aggregation: data.aggregation, format: asFormat(data.format), wholeRupees: true })
    : null;
  const unit = data?.datasource === 'transactions' ? ['transaction', 'transactions'] : ['row', 'rows'];
  const description = data
    ? [
        `${data.rowCount} ${data.rowCount === 1 ? unit[0] : unit[1]} ${data.rowCount === 1 ? 'makes' : 'make'} up this figure`,
        data.range ? formatDateRange(data.range.from, data.range.to) : null,
        request && hidesExcluded(request) ? 'excluded rows hidden' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  const changePeriod = (next: string) => {
    setPeriod(next as UnderlyingPeriod);
    setPage(0);
  };
  const changeEntry = (value: string | string[]) => {
    setEntry(String(value));
    // A category's request may have no previous period, so the new rows start at this period's first page.
    setPeriod('current');
    setPage(0);
  };
  const changeSort = (value: string | string[]) => {
    const [key, direction] = String(value).split(',');
    setSort(value === DEFAULT_SORT ? null : { key, direction: direction as SortClause['direction'] });
    setPage(0);
  };
  // After a failed page fetch the pager shows the last good page, so asking for the failed page again is a retry.
  const changePage = (next: number) => {
    if (next === page && query.isError) void query.refetch();
    else setPage(next);
  };

  const download = async () => {
    setDownloading(true);
    setCsvError(null);
    try {
      const blob = await fetchUnderlyingCsv(source, { period, sort });
      saveBlob(blob, underlyingCsvFilename(data?.measureLabel ? `Underlying data ${data.measureLabel}` : 'Underlying data', data?.range));
    } catch (e) {
      setCsvError(getErrorMessage(e, 'Could not download the CSV. Try again.'));
    } finally {
      setDownloading(false);
    }
  };

  const sortOptions = [
    { value: DEFAULT_SORT, label: 'Default order' },
    ...(raw?.columns ?? []).flatMap((c) => [
      { value: `${c.key},desc`, label: `${c.label} (descending)` },
      { value: `${c.key},asc`, label: `${c.label} (ascending)` },
    ]),
  ];
  const allLabel = 'All';
  const entryOptions = [
    { value: ALL_ENTRIES, label: allLabel },
    ...(entries ?? []).map((e, i) => ({ value: String(i), label: e.label })),
  ];
  const entryText = entryOptions.find((o) => o.value === entry)?.label ?? allLabel;
  const entryChip = dimensionLabel ? `${dimensionLabel}: ${entryText}` : entryText;
  const sortedColumn = sort ? raw?.columns.find((c) => c.key === sort.key) : null;
  const footer = data ? excludedLine(data.notCounted) : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="xl"
        title={customTitle ?? (figure ? `Underlying data · ${figure}` : 'Underlying data')}
        description={description}
        tertiary={{ label: 'Download CSV', icon: 'download', onSelect: download, loading: downloading, disabled: !data }}
        secondary={{ label: 'Close', onSelect: onClose }}
      >
        <DialogBody>
          {shown?.previousAvailable ? (
            <Tabs
              value={period}
              onValueChange={changePeriod}
              items={[
                { value: 'current', label: 'This period' },
                { value: 'previous', label: 'Previous period' },
              ]}
            />
          ) : null}

          {query.isError ? (
            <Banner tone="danger" title="Could not load the underlying data">
              {getErrorMessage(query.error, 'Try again in a moment.')}
            </Banner>
          ) : null}
          {csvError ? (
            <Banner tone="danger" title="Could not download the CSV" onDismiss={() => setCsvError(null)}>
              {csvError}
            </Banner>
          ) : null}

          {!data && !query.isError ? (
            <div className="flex flex-col gap-space-8" data-testid="underlying-loading">
              <Skeleton height={32} />
              <Skeleton height={160} />
            </div>
          ) : null}

          {raw && data ? (
            <>
              <div className="flex flex-wrap justify-end gap-space-8">
                {entries && entries.length > 0 ? (
                  <Select
                    value={entry}
                    options={entryOptions}
                    onValueChange={changeEntry}
                    trigger={
                      <FilterChip hasDropdown selected={entry !== ALL_ENTRIES}>
                        {entryChip}
                      </FilterChip>
                    }
                  />
                ) : null}
                <Select
                  value={sortValue(sort)}
                  options={sortOptions}
                  onValueChange={changeSort}
                  trigger={
                    <FilterChip hasDropdown selected={sort !== null}>
                      {sortedColumn ? `Sort: ${sortedColumn.label.toLowerCase()}` : 'Sort'}
                    </FilterChip>
                  }
                />
              </div>
              <DataTable
                columns={columns}
                data={rows}
                getRowId={(row) => row.__row}
                busy={query.isFetching}
                phoneSub={phoneSub}
                pager={
                  <Pager
                    variant="compact"
                    page={raw.page.number}
                    size={raw.page.size}
                    totalElements={raw.page.totalElements}
                    totalPages={raw.page.totalPages}
                    unit="rows"
                    onPageChange={changePage}
                  />
                }
                footer={footer ? <Text variant="caption" tone="ink-3">{footer}</Text> : undefined}
                empty={<EmptyState compact description="No rows make up this figure." />}
              />
            </>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
