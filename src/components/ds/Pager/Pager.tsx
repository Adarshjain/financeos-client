'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { Select } from '../Select/Select';

export interface PagerProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  page: number; // 0-based
  size: number;
  totalElements: number;
  totalPages?: number;
  unit?: string;
  summary?: (r: { start: number; end: number; total: number }) => React.ReactNode;
  sizeLabel?: (size: number) => string;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  sizeOptions?: number[];
  borderPosition?: 'top' | 'bottom' | 'none';
  /** `compact` trims the padding and uses small controls, for tight lists (owner, 2026-10-17). */
  variant?: 'default' | 'compact';
  /** Keeps the pager when everything fits one page. Default: hidden when the total fits the smallest page size. */
  alwaysShow?: boolean;
}

/** The page sizes a list offers; one list everywhere. The first is the default size. */
export const PAGE_SIZE_OPTIONS: number[] = [25, 50, 100];

/** First, last, current and `neighbours` either side; a gap of exactly one page shows that page, never an ellipsis. */
function pageSet(currentPage: number, totalPages: number, neighbours: number): number[] {
  if (totalPages <= 1) return [];
  const targets = new Set<number>([0, totalPages - 1, currentPage]);
  for (let d = 1; d <= neighbours; d++) {
    targets.add(currentPage - d);
    targets.add(currentPage + d);
  }
  const sorted = Array.from(targets)
    .filter((p) => p >= 0 && p < totalPages)
    .sort((a, b) => a - b);
  const filled: number[] = [];
  for (const p of sorted) {
    const prev = filled[filled.length - 1];
    if (prev !== undefined && p - prev === 2) filled.push(prev + 1);
    filled.push(p);
  }
  return filled;
}

type PageItem = { kind: 'page'; page: number } | { kind: 'ellipsis'; key: string };

/** Page numbers with an ellipsis wherever more than one page is skipped. Phone and desktop show the same items. */
function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  const pages = pageSet(currentPage, totalPages, 1);
  const items: PageItem[] = [];
  pages.forEach((p, i) => {
    const prev = pages[i - 1];
    if (prev !== undefined && p - prev > 1) items.push({ kind: 'ellipsis', key: `gap-${p}` });
    items.push({ kind: 'page', page: p });
  });
  return items;
}

/**
 * Pager: pagination for lists that outgrow one page.
 * Sits above and below the list in table cards or card grids.
 * Server-side paging only. Hides itself when everything fits one page (`alwaysShow` keeps it); otherwise the range, one "25 / page" select and the page buttons.
 * Uses desk: CSS breakpoint classes to switch between compact mobile and desktop layouts.
 */
export const Pager = forwardRef<HTMLElement, PagerProps>(
  (
    {
      page,
      size,
      totalElements,
      totalPages: customTotalPages,
      unit,
      summary,
      sizeLabel,
      onPageChange,
      onSizeChange,
      sizeOptions = PAGE_SIZE_OPTIONS,
      borderPosition = 'top',
      variant = 'compact',
      alwaysShow = false,
      className,
      ...props
    },
    ref,
  ) => {
    const totalPages =
      customTotalPages ?? Math.max(1, Math.ceil(totalElements / size));
    const isSinglePage = totalPages <= 1;

    const start = totalElements === 0 ? 0 : page * size + 1;
    const end = Math.min((page + 1) * size, totalElements);
    const formatSize = sizeLabel ?? ((s: number) => `${s} / page`);

    const pageItems = getPageItems(page, totalPages);
    const compact = variant === 'compact';
    const control = compact
      ? 'min-w-control-sm h-control-sm'
      : 'min-w-control-md h-control-md';

    // Everything fits one page at every size (and we are on the first page, so a shrunk total can still page back): nothing to page through or resize.
    if (!alwaysShow && page === 0 && isSinglePage && totalElements <= Math.min(size, ...sizeOptions)) return null;

    return (
      <nav
        ref={ref}
        aria-label="Pagination"
        className={cn(
          'flex items-center justify-between gap-space-8 flex-wrap font-medium text-ink-3 select-none bg-surface',
          compact
            ? 'text-label px-space-12 py-space-4'
            : 'text-body px-space-14 py-space-10',
          borderPosition === 'top' && 'border-t border-line-soft',
          borderPosition === 'bottom' && 'border-b border-line-soft',
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-space-4">
          {summary ? (
            summary({ start, end, total: totalElements })
          ) : (
            <>
              <span className="font-bold text-ink tabular-nums">
                {totalElements === 0 ? '0' : `${start}–${end}`}
              </span>
              <span>/ {totalElements}</span>
              {unit && (
                <span className="hidden desk:inline">
                  {unit}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-space-4 ml-auto">
          <div className="hidden desk:inline-flex items-center">
            {onSizeChange ? (
              <Select
                options={sizeOptions.map((opt) => ({
                  value: String(opt),
                  label: formatSize(opt),
                }))}
                value={String(size)}
                onValueChange={(val) => {
                  if (typeof val === 'string') {
                    onSizeChange(Number(val));
                  }
                }}
                trigger={
                  <Button
                    variant="secondary"
                    size={compact ? 'sm' : 'md'}
                    aria-label="Rows per page"
                    className={cn(
                      'gap-space-6 px-space-10 text-label font-semibold text-ink-2 mr-space-6 bg-surface',
                      compact ? 'h-control-sm' : 'h-control-md',
                    )}
                  >
                    <span>{formatSize(size)}</span>
                    <Icon name="chevron-down" size="sm" className="text-ink-4 shrink-0" />
                  </Button>
                }
              />
            ) : null}
          </div>

          {!isSinglePage && (
            <>
              <Button
                variant="secondary"
                size={compact ? 'sm' : 'md'}
                iconOnly
                aria-label="Previous page"
                disabled={page <= 0}
                onClick={() => onPageChange(page - 1)}
                className={cn(control, 'px-space-6 border-line-strong text-ink-3')}
              >
                <Icon name="chevron-left" size="md" />
              </Button>

              <div className="flex items-center gap-space-4">
                {pageItems.map((item) => {
                  if (item.kind === 'ellipsis') {
                    return (
                      <span
                        key={item.key}
                        aria-hidden="true"
                        className="w-space-16 text-center text-ink-faint text-label select-none"
                      >
                        …
                      </span>
                    );
                  }

                  const isActive = page === item.page;
                  const pageNumber = item.page + 1; // 1-based display

                  return (
                    <Button
                      key={item.page}
                      variant={isActive ? 'primary' : 'ghost'}
                      size={compact ? 'sm' : 'md'}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onPageChange(item.page)}
                      className={cn(
                        control,
                        'px-space-6 rounded-ds-md tabular-nums font-semibold',
                        isActive ? 'font-bold' : 'text-ink-2',
                      )}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="secondary"
                size={compact ? 'sm' : 'md'}
                iconOnly
                aria-label="Next page"
                disabled={page >= totalPages - 1}
                onClick={() => onPageChange(page + 1)}
                className={cn(control, 'px-space-6 border-line-strong text-ink-3')}
              >
                <Icon name="chevron-right" size="md" />
              </Button>
            </>
          )}
        </div>
      </nav>
    );
  },
);

Pager.displayName = 'Pager';
