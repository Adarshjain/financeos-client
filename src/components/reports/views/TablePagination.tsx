'use client';

// Shared pager: the rows on screen out of the total (optional), a page-size control,
// and numbered paging (first, last, and the pages around the current one). Used by
// every paged list and table; full pages wrap their list in `PagedSection` to get it
// above and below. Page/size are a runtime concern (query params), never part of a
// saved report definition.

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pageItems } from '@/lib/pagination';
import type { TablePage } from '@/lib/reports.types';
import { BELOW_SM_QUERY, useMediaQuery } from '@/lib/useMediaQuery';
import { cn } from '@/lib/utils';

/** Server default is 50, max 1000. */
export const DEFAULT_TABLE_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 500];

interface TablePaginationProps {
  page: TablePage;
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
  /** Noun for the total count (singular); pluralized with a trailing "s". */
  unit?: string;
  loading?: boolean;
  className?: string;
  /** Off: no total row count, only the paging controls (the underlying-data dialog). */
  showCount?: boolean;
  /** Page sizes to offer, when the endpoint caps them lower than the defaults. */
  pageSizeOptions?: number[];
  /**
   * For a pager sharing a toolbar row: on phones it drops the count and the
   * page-size control and uses smaller buttons, so it fits beside the toolbar.
   */
  phoneCompact?: boolean;
}

export function TablePagination({
  page,
  onPageChange,
  onSizeChange,
  unit = 'row',
  loading = false,
  className,
  showCount = true,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  phoneCompact = false,
}: TablePaginationProps) {
  // Always offer the current size, even if it isn't one of the presets.
  const sizes = pageSizeOptions.includes(page.size)
    ? pageSizeOptions
    : [...pageSizeOptions, page.size].sort((a, b) => a - b);
  const sizeOptions = sizes.map((s) => ({
    value: String(s),
    label: `${s} / page`,
  }));

  // Phones get one page number fewer each side so the row fits a 320px screen.
  const isPhone = useMediaQuery(BELOW_SM_QUERY);
  const compact = phoneCompact && isPhone;
  const buttonSize = compact ? 'icon-xs' : 'icon-sm';
  // A page past the end (rows deleted since it was opened) still counts, so the
  // pager stays up and you can step back from it.
  const pageCount = Math.max(page.totalPages, page.number + 1);
  const multiPage = pageCount > 1;
  const from = page.number * page.size + 1;
  const to = Math.min((page.number + 1) * page.size, page.totalElements);
  const count = (
    <span>
      {page.totalElements.toLocaleString('en-IN')} {unit}
      {page.totalElements === 1 ? '' : 's'}
    </span>
  );
  // Hidden on phones when the pager shares a toolbar row.
  const phoneHidden = phoneCompact ? 'hidden sm:inline' : undefined;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500',
        className
      )}
    >
      {showCount &&
        (multiPage && from <= to ? (
          <span className={phoneHidden}>
            <span className="tabular-nums">
              {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')}
            </span>{' '}
            of {count}
          </span>
        ) : (
          <span className={phoneHidden}>{count}</span>
        ))}
      <div className={cn('flex items-center gap-2', !showCount && 'ml-auto')}>
        {onSizeChange && (
          <div className={cn(phoneCompact && 'hidden sm:block')}>
            <Select
              value={String(page.size)}
              onValueChange={(val) => onSizeChange(Number(val))}
              disabled={loading}
            >
              <SelectTrigger
                aria-label="Rows per page"
                className="w-[110px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-none h-8"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                {sizeOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {multiPage && (
          <nav aria-label="Pagination" className="flex items-center gap-1">
            <Button
              variant="outline"
              size={buttonSize}
              aria-label="Previous page"
              disabled={page.number <= 0 || loading}
              onClick={() => onPageChange?.(page.number - 1)}
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </Button>
            {pageItems(page.number, pageCount, isPhone ? 0 : 1).map(
              (item, i) =>
                item === 'gap' ? (
                  <span
                    key={`gap-${i}`}
                    aria-hidden
                    className={cn(
                      'text-center text-xs text-slate-400',
                      compact ? 'w-4' : 'w-5'
                    )}
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={item === page.number ? 'default' : 'ghost'}
                    size={buttonSize}
                    className={cn(
                      'w-auto px-1.5 tabular-nums',
                      compact ? 'min-w-7' : 'min-w-8'
                    )}
                    aria-label={`Page ${item + 1}`}
                    aria-current={item === page.number ? 'page' : undefined}
                    disabled={loading}
                    onClick={() => item !== page.number && onPageChange?.(item)}
                  >
                    {(item + 1).toLocaleString('en-IN')}
                  </Button>
                )
            )}
            <Button
              variant="outline"
              size={buttonSize}
              aria-label="Next page"
              disabled={page.number >= page.totalPages - 1 || loading}
              onClick={() => onPageChange?.(page.number + 1)}
            >
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Button>
          </nav>
        )}
      </div>
    </div>
  );
}
