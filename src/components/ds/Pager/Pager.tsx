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
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  sizeOptions?: number[];
  borderPosition?: 'top' | 'bottom' | 'none';
}

export function getPageNumbers(
  currentPage: number, // 0-based
  totalPages: number,
  compact: boolean,
): (number | 'ellipsis')[] {
  if (totalPages <= 1) return [];

  // Indices to include: full view keeps first, current ± 1, last; compact view drops current neighbours
  const targets = new Set<number>();
  targets.add(0);
  targets.add(totalPages - 1);
  targets.add(currentPage);

  if (!compact) {
    if (currentPage > 0) targets.add(currentPage - 1);
    if (currentPage < totalPages - 1) targets.add(currentPage + 1);
  }

  const sorted = Array.from(targets)
    .filter((p) => p >= 0 && p < totalPages)
    .sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr - prev > 1) {
        result.push('ellipsis');
      }
    }
    result.push(sorted[i]);
  }

  return result;
}

/**
 * Pager: pagination for lists that outgrow one page.
 * Sits above and below the list in table cards or card grids.
 * Server-side paging only. Single page shows count and page size only, no arrows.
 * Uses lg: CSS breakpoint classes to switch between compact mobile and desktop layouts.
 */
export const Pager = forwardRef<HTMLElement, PagerProps>(
  (
    {
      page,
      size,
      totalElements,
      totalPages: customTotalPages,
      unit = 'transaction',
      onPageChange,
      onSizeChange,
      sizeOptions = [25, 50, 100],
      borderPosition = 'top',
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

    // Unit pluralization
    const formattedUnit = unit.endsWith('s') || unit.includes(' ')
      ? unit
      : totalElements === 1
        ? unit
        : `${unit}s`;

    const pageItems = getPageNumbers(page, totalPages, false);

    return (
      <nav
        ref={ref}
        aria-label="Pagination"
        className={cn(
          'flex items-center justify-between gap-space-8 flex-wrap font-medium text-body text-ink-3 px-space-14 py-space-10 select-none bg-surface',
          borderPosition === 'top' && 'border-t border-line-soft',
          borderPosition === 'bottom' && 'border-b border-line-soft',
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-space-4">
          <span className="font-bold text-ink tabular-nums">
            {totalElements === 0 ? '0' : `${start}–${end}`}
          </span>
          <span>of {totalElements}</span>
          <span className="hidden lg:inline pg-unit">
            {formattedUnit}
          </span>
        </div>

        <div className="flex items-center gap-space-4 ml-auto pg-r">
          <div className="hidden lg:inline-flex items-center">
            {onSizeChange ? (
              <Select
                options={sizeOptions.map((opt) => ({
                  value: String(opt),
                  label: `${opt} / page`,
                }))}
                value={String(size)}
                onChange={(val) => {
                  if (typeof val === 'string') {
                    onSizeChange(Number(val));
                  }
                }}
                trigger={
                  <Button
                    variant="secondary"
                    size="md"
                    aria-label="Rows per page"
                    className="gap-space-6 h-control-md px-space-10 text-label font-semibold text-ink-2 mr-space-6 bg-surface"
                  >
                    <span>{size} / page</span>
                    <Icon name="chevron-down" size="sm" className="text-ink-4 shrink-0" />
                  </Button>
                }
                menuClassName="min-w-fit"
              />
            ) : (
              <span className="inline-flex items-center gap-space-6 h-control-md px-space-10 border border-line-strong rounded-ds-md text-label font-semibold text-ink-2 mr-space-6 bg-surface">
                {size} / page
              </span>
            )}
          </div>

          {!isSinglePage && (
            <>
              <Button
                variant="secondary"
                size="md"
                iconOnly
                aria-label="Previous page"
                disabled={page <= 0}
                onClick={() => onPageChange(page - 1)}
                className="min-w-control-md h-control-md px-space-6 border-line-strong text-ink-3"
              >
                <Icon name="chevron-left" size="md" />
              </Button>

              <div className="flex items-center gap-space-4">
                {pageItems.map((item, idx) => {
                  if (item === 'ellipsis') {
                    return (
                      <span
                        key={`gap-${idx}`}
                        aria-hidden="true"
                        className="w-space-16 text-center text-ink-faint text-label select-none"
                      >
                        …
                      </span>
                    );
                  }

                  const isActive = page === item;
                  const isNeighbour =
                    (item === page - 1 || item === page + 1) &&
                    item !== 0 &&
                    item !== totalPages - 1;
                  const pageNumber = item + 1; // 1-based display

                  return (
                    <Button
                      key={item}
                      variant={isActive ? 'primary' : 'ghost'}
                      size="md"
                      aria-label={`Page ${pageNumber}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onPageChange(item)}
                      className={cn(
                        'min-w-control-md h-control-md px-space-6 rounded-ds-md tabular-nums font-semibold',
                        isActive ? 'font-bold' : 'text-ink-2',
                        isNeighbour && 'hidden lg:inline-flex',
                      )}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="secondary"
                size="md"
                iconOnly
                aria-label="Next page"
                disabled={page >= totalPages - 1}
                onClick={() => onPageChange(page + 1)}
                className="min-w-control-md h-control-md px-space-6 border-line-strong text-ink-3"
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
