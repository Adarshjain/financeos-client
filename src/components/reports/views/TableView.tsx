'use client';

// Presentational table renderer. Columns come from the API (the hidden raw-row
// `id` is not among them — it stays available as the React key for drill-through
// later). Paging is driven by the parent via `onPageChange`; page/size are a
// runtime concern, never part of the saved definition.

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TableColumn, TableData } from '@/lib/reports.types';
import { formatDate, formatMoney } from '@/lib/utils';

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
  onPageChange?: (page: number) => void;
}

export function TableView({ data, onPageChange }: TableViewProps) {
  const { columns, rows, page } = data;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
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
      </div>

      {page.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {page.totalElements.toLocaleString('en-IN')} row
            {page.totalElements === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page.number <= 0}
              onClick={() => onPageChange?.(page.number - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums">
              {page.number + 1} / {page.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page.number >= page.totalPages - 1}
              onClick={() => onPageChange?.(page.number + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
