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
import { groupLabel, groupTotal } from '@/features/reports/underlying/underlyingModel';
import { formatCell } from '@/features/reports/view/cellsModel';
import type {
  SortClause,
  TableColumn,
  TableData,
  TableRow as ReportTableRow,
} from '@/lib/reports.types';
import { cn } from '@/lib/utils';

import { TitleCell } from './tableCells';
import { TablePagination } from './TablePagination';

/** A subtitle column's text for a row, or null when it is empty (nothing to print beside the title). */
export function subtitleText(row: ReportTableRow, column: TableColumn | null | undefined): string | null {
  if (!column) return null;
  const value = row[column.key];
  if (value === null || value === undefined || value === '') return null;
  return formatCell(value, column);
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
  /** While grouped, leaves the group column out: its value already heads each group. */
  hideGroupColumn?: boolean;
  /**
   * While grouped: each group's total over the whole data set (keyed by the stored group value),
   * printed in the group header under `groupTotalKey`'s column, formatted like that column.
   */
  groupTotals?: Record<string, number> | null;
  groupTotalKey?: string | null;
  /** Leaves the row count out of the footer; paging stays (shown only when there is more than one page). */
  hideRowCount?: boolean;
  /**
   * A column printed as a muted label beside the first column's value instead of in its own
   * column (net worth: the kind beside the name).
   */
  subtitleKey?: string | null;
  /** Leaves the pager out altogether: the parent draws one for several tables sharing a page. */
  hidePagination?: boolean;
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
  hideGroupColumn,
  groupTotals,
  groupTotalKey,
  hideRowCount,
  subtitleKey,
  hidePagination,
}: TableViewProps) {
  const { rows, page } = data;
  const groupColumn = groupField != null ? data.columns.find((c) => c.key === groupField) : undefined;
  const groupLabels = groupColumn?.valueLabels;
  const subtitleColumn = subtitleKey != null ? data.columns.find((c) => c.key === subtitleKey) : undefined;
  // The group column heads each group and the subtitle column rides beside the first: neither stands alone.
  const hidden = new Set<string>();
  if (groupField != null && hideGroupColumn) hidden.add(groupField);
  if (subtitleColumn) hidden.add(subtitleColumn.key);
  const columns = hidden.size > 0 ? data.columns.filter((c) => !hidden.has(c.key)) : data.columns;
  // The group header's total sits in this column; the label spans the columns before it.
  const totalIndex = groupTotals && groupTotalKey ? columns.findIndex((c) => c.key === groupTotalKey) : -1;
  const multiPage = page.totalElements > page.size || page.number > 0;
  // Inside a dashboard widget a single page needs no footer: it only repeats the row count.
  // Without the count, a single page has nothing to show at all.
  const showFooter = !hidePagination && (hideRowCount ? multiPage || !!onSizeChange : !fill || multiPage);

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
                    <GroupHeaderRow
                      label={groupHeader}
                      columns={columns}
                      totalIndex={totalIndex}
                      total={groupTotal(groupTotals, groupField != null ? row[groupField] : undefined)}
                    />
                  )}
                  <TableRow
                    {...(onRowClick && {
                      onClick: () => onRowClick(row),
                      className:
                        'cursor-pointer hover:bg-slate-50 has-[:focus-visible]:bg-slate-50 dark:hover:bg-slate-800/60 dark:has-[:focus-visible]:bg-slate-800/60',
                    })}
                  >
                    {columns.map((c, ci) => {
                      const content =
                        ci === 0 ? (
                          <TitleCell text={formatCell(row[c.key], c)} subtitle={subtitleText(row, subtitleColumn)} />
                        ) : (
                          formatCell(row[c.key], c)
                        );
                      return (
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
                              {content}
                            </button>
                          ) : (
                            content
                          )}
                        </TableCell>
                      );
                    })}
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
            showCount={!hideRowCount}
          />
        </div>
      )}
    </div>
  );
}

const GROUP_CELL = 'bg-slate-50 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300';

/**
 * A group's header row: the label across the full width, or — with a total — the label across the
 * columns before the total's column, the total right-aligned in it, and blanks after.
 */
function GroupHeaderRow({
  label,
  columns,
  totalIndex,
  total,
}: {
  label: string;
  columns: TableColumn[];
  totalIndex: number;
  total: number | undefined;
}) {
  if (totalIndex < 0 || total === undefined) {
    return (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={columns.length || 1} className={GROUP_CELL}>
          {label}
        </TableCell>
      </TableRow>
    );
  }
  const after = columns.length - totalIndex - 1;
  return (
    <TableRow className="hover:bg-transparent" data-group-header="">
      {totalIndex > 0 && (
        <TableCell colSpan={totalIndex} className={GROUP_CELL}>
          {label}
        </TableCell>
      )}
      <TableCell className={cn(GROUP_CELL, 'whitespace-nowrap tabular-nums')}>
        {totalIndex === 0 && <span className="mr-2">{label}</span>}
        {formatCell(total, columns[totalIndex])}
      </TableCell>
      {after > 0 && <TableCell colSpan={after} className={GROUP_CELL} />}
    </TableRow>
  );
}
