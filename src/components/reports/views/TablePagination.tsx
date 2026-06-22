'use client';

// Shared table footer: total count, a page-size control, and prev/next paging.
// Used by both the raw TableView and the PivotTableView. Page/size are a runtime
// concern (query params), never part of the saved report definition.

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
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
          <NativeSelect
            className="w-auto py-1"
            options={sizeOptions}
            value={String(page.size)}
            onChange={(e) => onSizeChange(Number(e.currentTarget.value))}
          />
        )}
        {page.totalPages > 1 && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
