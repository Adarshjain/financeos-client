'use client';

// Presentational PIVOT (aggregated) table renderer. Lays out row dimensions
// down the left and column-combos × measures across the top; each body cell is
// rows[i].cells[columnKey][measureKey] (missing → blank). When there are no
// column dimensions the server returns a single column with key "", so it
// renders as a plain rows × measures table. Header values for date dimensions
// arrive pre-formatted from the server and are rendered verbatim. Paging/size
// (over row groups) are driven by the parent — a runtime concern, not part of
// the saved definition.

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  PivotColumn,
  PivotMeasureInfo,
  PivotTableData,
} from '@/lib/reports.types';
import { cn, formatMoney } from '@/lib/utils';

import { TablePagination } from './TablePagination';

// Format a measure cell the same way the KPI/raw-table views do.
function formatMeasure(
  value: number | undefined,
  measure: PivotMeasureInfo
): string {
  if (value === undefined || value === null) return '—';
  if (measure.aggregation === 'count') {
    return new Intl.NumberFormat('en-IN').format(value);
  }
  if (measure.field === 'amount') return formatMoney(value);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(
    value
  );
}

interface PivotTableViewProps {
  data: PivotTableData;
  /**
   * Fill the parent's height: the column header pins to the top, the pagination
   * bar to the bottom, and only the rows scroll between them. Used by fixed-
   * height containers like dashboard widgets. In flow layouts (the builder's
   * preview pane) leave it off so the table grows with its content.
   */
  fill?: boolean;
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
}

export function PivotTableView({
  data,
  fill,
  onPageChange,
  onSizeChange,
}: PivotTableViewProps) {
  const { rowDimensions, columnDimensions, measures, columns, rows, page } =
    data;

  const hasColumnDims = columnDimensions.length > 0;
  // A second header row (measure names under each column) is only needed when a
  // column combo carries more than one measure.
  const twoRowHeader = hasColumnDims && measures.length > 1;

  // Join a column combo's values in column-dimension order; rendered as-is.
  const columnLabel = (col: PivotColumn) =>
    columnDimensions
      .map((cd) => col.values[cd.field])
      .filter((v) => v !== undefined && v !== null && v !== '')
      .join(' · ');

  const bodyColCount =
    rowDimensions.length +
    (hasColumnDims ? columns.length * measures.length : measures.length);

  return (
    <div className={fill ? 'flex h-full flex-col' : 'space-y-3'}>
      <Table
        wrapperClassName={cn(
          'rounded-lg border border-slate-200 dark:border-slate-800',
          fill && 'min-h-0 flex-1 rounded-b-none border-b-0'
        )}
      >
        <TableHeader
          className={cn(
            fill && 'sticky top-0 z-10 bg-slate-50 dark:bg-slate-800'
          )}
        >
          <TableRow>
            {rowDimensions.map((rd) => (
              <TableHead
                key={rd.field}
                rowSpan={twoRowHeader ? 2 : 1}
                className="whitespace-nowrap align-bottom"
              >
                {rd.label}
              </TableHead>
            ))}
            {hasColumnDims
              ? columns.map((col) => (
                  <TableHead
                    key={col.key}
                    colSpan={measures.length}
                    className="whitespace-nowrap text-center"
                  >
                    {columnLabel(col)}
                  </TableHead>
                ))
              : measures.map((m) => (
                  <TableHead
                    key={m.key}
                    className="whitespace-nowrap text-right"
                  >
                    {m.label}
                  </TableHead>
                ))}
          </TableRow>
          {twoRowHeader && (
            <TableRow>
              {columns.flatMap((col) =>
                measures.map((m) => (
                  <TableHead
                    key={`${col.key}__${m.key}`}
                    className="whitespace-nowrap text-right"
                  >
                    {m.label}
                  </TableHead>
                ))
              )}
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={bodyColCount || 1}
                className="py-8 text-center text-slate-500"
              >
                No rows for this configuration.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.key}>
                {rowDimensions.map((rd) => (
                  <TableCell
                    key={rd.field}
                    className="whitespace-nowrap font-medium"
                  >
                    {row.values[rd.field] ?? '—'}
                  </TableCell>
                ))}
                {columns.flatMap((col) =>
                  measures.map((m) => (
                    <TableCell
                      key={`${col.key}__${m.key}`}
                      className="whitespace-nowrap text-right tabular-nums"
                    >
                      {formatMeasure(row.cells[col.key]?.[m.key], m)}
                    </TableCell>
                  ))
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div
        className={cn(
          fill &&
            'shrink-0 rounded-b-lg border border-t-0 border-slate-200 px-3 py-2 dark:border-slate-800'
        )}
      >
        <TablePagination
          page={page}
          unit="row group"
          onPageChange={onPageChange}
          onSizeChange={onSizeChange}
        />
      </div>
    </div>
  );
}
