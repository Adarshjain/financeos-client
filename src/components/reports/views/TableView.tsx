'use client';

// Presentational RAW table renderer. Columns come from the API (the hidden
// raw-row `id` is not among them — it is handed back to `onRowClick` for
// drill-through). Paging/size/sort are driven by the parent via
// `onPageChange` / `onSizeChange` / `onSortChange`; all are a runtime concern,
// never part of the saved definition. Aggregated (pivot) tables render via
// PivotTableView instead.

import { ArrowDown, ArrowUp } from 'lucide-react';
import { Fragment, type ThHTMLAttributes } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMeasureValue, valueLabel } from '@/lib/reports.helpers';
import type {
  SortClause,
  TableColumn,
  TableData,
  TableRow as ReportTableRow,
} from '@/lib/reports.types';
import { cn, formatDate } from '@/lib/utils';

import { TablePagination } from './TablePagination';

function formatCell(value: unknown, column: TableColumn): string {
  if (value === null || value === undefined || value === '') return '—';
  if (column.type === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(n)) return String(value);
    // Raw rows carry no aggregation; the catalog format hint wins over the name heuristic.
    return formatMeasureValue(n, { field: column.key, format: column.format ?? undefined });
  }
  if (column.type === 'date') return formatDate(String(value));
  if (column.type === 'boolean') return value === true || value === 'true' ? 'Yes' : 'No';
  return valueLabel(String(value), column.valueLabels);
}

/**
 * The header-click sort cycle for one column: asc → desc → default (null).
 * Clicking a column other than the active one starts it at asc.
 */
export function nextSort(current: SortClause | null | undefined, key: string): SortClause | null {
  if (!current || current.key !== key) return { key, direction: 'asc' };
  return current.direction === 'asc' ? { key, direction: 'desc' } : null;
}

interface SortableTableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  label: string;
  /** The runtime sort key this header sorts by. */
  sortKey: string;
  sort: SortClause | null | undefined;
  onSortChange: (sort: SortClause | null) => void;
  /** Right-aligns the label (measure columns). */
  align?: 'left' | 'right';
}

/**
 * A header cell whose label is a button cycling the column's runtime sort.
 * The th carries `aria-sort`; only the active column shows a direction arrow.
 * The button takes over the cell's padding so the whole cell is the tap
 * target, and re-states the header typography (buttons reset text-transform).
 */
export function SortableTableHead({
  label,
  sortKey,
  sort,
  onSortChange,
  align = 'left',
  className,
  ...thProps
}: SortableTableHeadProps) {
  const direction = sort?.key === sortKey ? sort.direction : null;
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      {...thProps}
      className={cn(className, 'p-0')}
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
    >
      <button
        type="button"
        onClick={() => onSortChange(nextSort(sort, sortKey))}
        className={cn(
          'flex w-full items-center gap-1 px-4 py-3 uppercase tracking-wider hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          align === 'right' && 'justify-end'
        )}
      >
        {label}
        {direction && <Icon className="h-3 w-3" aria-hidden="true" />}
      </button>
    </TableHead>
  );
}

/**
 * A group header's label: the group column's server label for the value when it has one,
 * else the value title-cased, underscores as spaces ("credit_card" → "Credit Card").
 */
function groupLabel(value: unknown, labels: Record<string, string> | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const label = labels?.[String(value)];
  if (label !== undefined) return label;
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

interface TableViewProps {
  data: TableData;
  /**
   * Fill the parent's height: the column header pins to the top, the pagination
   * bar to the bottom, and only the rows scroll between them. Used by fixed-
   * height containers like dashboard widgets. In flow layouts (the builder's
   * preview pane) leave it off so the table grows with its content.
   */
  fill?: boolean;
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
  /** Disables the paging controls while a page fetch is in flight. */
  loading?: boolean;
  /** The runtime sort (null = the report's own order); marks the active header. */
  sort?: SortClause | null;
  /** Makes every header a sort toggle; omitted, headers are plain labels. */
  onSortChange?: (sort: SortClause | null) => void;
  /**
   * Makes rows activatable; receives the row incl. its hidden `id`. The whole
   * row is the mouse target, and the first cell holds a real button for the
   * keyboard and assistive tech (the row itself stays a table row).
   */
  onRowClick?: (row: ReportTableRow) => void;
  /** Inserts a full-width group header row whenever `row[groupField]` changes within the page. */
  groupField?: string | null;
}

export function TableView({
  data,
  fill,
  onPageChange,
  onSizeChange,
  loading,
  sort,
  onSortChange,
  onRowClick,
  groupField,
}: TableViewProps) {
  const { columns, rows, page } = data;
  const groupLabels =
    groupField != null ? columns.find((c) => c.key === groupField)?.valueLabels : undefined;
  // Inside a dashboard widget a single page needs no footer: it only repeats the row count.
  const showFooter = !fill || page.totalElements > page.size || page.number > 0;

  return (
    <div className={fill ? 'flex h-full flex-col' : 'space-y-3'}>
      <Table
        wrapperClassName={cn(
          fill && 'min-h-0 flex-1 rounded-b-none border-b-0'
        )}
      >
        <TableHeader
          className={cn(
            fill && 'sticky top-0 z-10 bg-slate-50 dark:bg-slate-800'
          )}
        >
          <TableRow>
            {columns.map((c) =>
              onSortChange ? (
                <SortableTableHead
                  key={c.key}
                  label={c.label}
                  sortKey={c.key}
                  sort={sort}
                  onSortChange={onSortChange}
                  className="whitespace-nowrap"
                />
              ) : (
                <TableHead key={c.key} className="whitespace-nowrap">
                  {c.label}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length || 1}
                className="py-8 text-center text-slate-500"
              >
                No rows for this configuration.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => {
              const groupHeader =
                groupField != null && (i === 0 || rows[i - 1][groupField] !== row[groupField])
                  ? groupLabel(row[groupField], groupLabels)
                  : null;
              // Ids may repeat within a page (one transaction under two matching
              // categories), so keys are always index-qualified.
              return (
                <Fragment key={`${String(row.id ?? '')}:${i}`}>
                  {groupHeader !== null && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={columns.length || 1}
                        className="bg-slate-50 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
                      >
                        {groupHeader}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow
                    {...(onRowClick && {
                      onClick: () => onRowClick(row),
                      className:
                        'cursor-pointer hover:bg-slate-50 has-[:focus-visible]:bg-slate-50 dark:hover:bg-slate-800/60 dark:has-[:focus-visible]:bg-slate-800/60',
                    })}
                  >
                    {columns.map((c, ci) => (
                      <TableCell key={c.key} className="whitespace-nowrap">
                        {onRowClick && ci === 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              // The row's own click handler would fire it a second time.
                              e.stopPropagation();
                              onRowClick(row);
                            }}
                            className="rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                          >
                            {formatCell(row[c.key], c)}
                          </button>
                        ) : (
                          formatCell(row[c.key], c)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>

      {showFooter && (
        <div
          className={cn(
            fill &&
              'shrink-0 rounded-b-lg border border-t-0 border-slate-200 px-3 py-2 dark:border-slate-800'
          )}
        >
          <TablePagination
            page={page}
            loading={loading}
            onPageChange={onPageChange}
            onSizeChange={onSizeChange}
          />
        </div>
      )}
    </div>
  );
}
