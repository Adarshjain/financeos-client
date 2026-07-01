'use client';

// Shared table footer: total count, a page-size control, and prev/next paging.
// Used by both the raw TableView and the PivotTableView. Page/size are a runtime
// concern (query params), never part of the saved report definition.

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TablePage } from '@/lib/reports.types';

/** Server default is 50, max 1000. */
export const DEFAULT_TABLE_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 500];

interface TablePaginationProps {
  page: TablePage;
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
  /** Noun for the total count (singular); pluralized with a trailing "s". */
  unit?: string;
}

export function TablePagination({
  page,
  onPageChange,
  onSizeChange,
  unit = 'row',
}: TablePaginationProps) {
  // Always offer the current size, even if it isn't one of the presets.
  const sizes = PAGE_SIZE_OPTIONS.includes(page.size)
    ? PAGE_SIZE_OPTIONS
    : [...PAGE_SIZE_OPTIONS, page.size].sort((a, b) => a - b);
  const sizeOptions = sizes.map((s) => ({ value: String(s), label: `${s} / page` }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
      <span>
        {page.totalElements.toLocaleString('en-IN')} {unit}
        {page.totalElements === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        {onSizeChange && (
          <Select
            value={String(page.size)}
            onValueChange={(val) => onSizeChange(Number(val))}
          >
            <SelectTrigger className="w-[110px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              {sizeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {page.totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors"
              disabled={page.number <= 0}
              onClick={() => onPageChange?.(page.number - 1)}
            >
              <ChevronLeft className="h-4 w-4 text-slate-550" />
            </Button>
            <span className="tabular-nums text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
              {page.number + 1} / {page.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors"
              disabled={page.number >= page.totalPages - 1}
              onClick={() => onPageChange?.(page.number + 1)}
            >
              <ChevronRight className="h-4 w-4 text-slate-550" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
