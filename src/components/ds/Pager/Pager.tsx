import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { forwardRef } from 'react';

import { cn } from '../cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../Menu/Menu';
import { useIsPhone } from '../useMediaQuery';

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
  variant?: 'desktop' | 'phone' | 'auto';
  borderPosition?: 'top' | 'bottom' | 'none';
}

export function getPageNumbers(
  currentPage: number, // 0-based
  totalPages: number,
  isPhone: boolean,
): (number | 'ellipsis')[] {
  if (totalPages <= 1) return [];

  // Indices to include: desktop keeps first, current ± 1, last; phone drops current neighbours
  const targets = new Set<number>();
  targets.add(0);
  targets.add(totalPages - 1);
  targets.add(currentPage);

  if (!isPhone) {
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
      variant = 'auto',
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

    const isPhoneDevice = useIsPhone();
    const isPhone = variant === 'phone' || (variant === 'auto' && isPhoneDevice);
    const isDesktop = variant === 'desktop' || (variant === 'auto' && !isPhoneDevice);

    // Unit pluralization
    const formattedUnit = unit.endsWith('s') || unit.includes(' ')
      ? unit
      : totalElements === 1
        ? unit
        : `${unit}s`;

    const pageItems = getPageNumbers(page, totalPages, isPhone);

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
          {!isPhone && (
            <span
              className={cn(
                isDesktop ? 'inline' : 'hidden sm:inline',
                'pg-unit',
              )}
            >
              {formattedUnit}
            </span>
          )}
        </div>

        <div className="flex items-center gap-space-4 ml-auto pg-r">
          {!isPhone && (
            <div
              className={cn(
                isDesktop ? 'inline-flex' : 'hidden sm:inline-flex',
                'items-center',
              )}
            >
              {onSizeChange ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Rows per page"
                      className="inline-flex items-center gap-space-6 h-control-md px-space-10 border border-line-strong rounded-ds-md text-label font-semibold text-ink-2 mr-space-6 bg-surface hover:bg-hover active:bg-hover transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      <span>{size} / page</span>
                      <ChevronDown
                        className="w-space-12 h-space-12 text-ink-4 shrink-0"
                        aria-hidden="true"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {sizeOptions.map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        active={opt === size}
                        onSelect={() => onSizeChange(opt)}
                      >
                        {opt} / page
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="inline-flex items-center gap-space-6 h-control-md px-space-10 border border-line-strong rounded-ds-md text-label font-semibold text-ink-2 mr-space-6 bg-surface">
                  {size} / page
                </span>
              )}
            </div>
          )}

          {!isSinglePage && (
            <>
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 0}
                onClick={() => onPageChange(page - 1)}
                className="min-w-control-md h-control-md px-space-6 rounded-ds-md border border-line-strong bg-surface text-ink-3 hover:bg-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-ink-3 inline-flex items-center justify-center cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <ChevronLeft
                  className="w-space-16 h-space-16"
                  aria-hidden="true"
                />
              </button>

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
                const pageNumber = item + 1; // 1-based display

                return (
                  <button
                    key={item}
                    type="button"
                    aria-label={`Page ${pageNumber}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onPageChange(item)}
                    className={cn(
                      'min-w-control-md h-control-md px-space-6 rounded-ds-md border-0 text-body font-semibold inline-flex items-center justify-center tabular-nums cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                      isActive
                        ? 'bg-brand text-on-brand font-bold'
                        : 'bg-transparent text-ink-2 hover:bg-hover hover:text-ink',
                    )}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages - 1}
                onClick={() => onPageChange(page + 1)}
                className="min-w-control-md h-control-md px-space-6 rounded-ds-md border border-line-strong bg-surface text-ink-3 hover:bg-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-ink-3 inline-flex items-center justify-center cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <ChevronRight
                  className="w-space-16 h-space-16"
                  aria-hidden="true"
                />
              </button>
            </>
          )}
        </div>
      </nav>
    );
  },
);
Pager.displayName = 'Pager';
