'use client';

// Presentational RAW table renderer. Columns come from the API (the hidden
// raw-row `id` is not among them — it stays available as the React key for
// drill-through later). Paging/size are driven by the parent via `onPageChange`
// / `onSizeChange`; both are a runtime concern, never part of the saved
// definition. Aggregated (pivot) tables render via PivotTableView instead.

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TableColumn, TableData } from '@/lib/reports.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { TablePagination } from './TablePagination';

function formatCell(value: unknown, column: TableColumn): string {
  if (value === null || value === undefined || value === '') return '—';
  if (column.type === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(n)) return String(value);
    return column.key.includes('amount')
      ? formatMoney(n)
      : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
  }
  if (column.type === 'date') return formatDate(String(value));
  return String(value);
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
}

export function TableView({
  data,
  fill,
  onPageChange,
  onSizeChange,
}: TableViewProps) {
  const { columns, rows, page } = data;

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
            {columns.map((c) => (
              <TableHead key={c.key} className="whitespace-nowrap">
                {c.label}
              </TableHead>
            ))}
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
            rows.map((row, i) => (
              <TableRow key={(row.id as string) ?? i}>
                {columns.map((c) => (
                  <TableCell key={c.key} className="whitespace-nowrap">
                    {formatCell(row[c.key], c)}
                  </TableCell>
                ))}
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
          onPageChange={onPageChange}
          onSizeChange={onSizeChange}
        />
      </div>
    </div>
  );
}
