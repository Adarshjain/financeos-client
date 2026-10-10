'use client';

// A paged list with the pager both above and below it. The top pager carries the
// page-size control; the bottom one is for moving on once you have read to the end,
// so it is only there when there is another page, and paging from it brings the top
// of the list back into view (the new page starts there). An empty first page shows
// neither: its empty state says it better than "0 rows".

import { type ReactNode, useRef } from 'react';

import { TablePagination } from './TablePagination';

type PagerProps = Omit<Parameters<typeof TablePagination>[0], 'className'>;

interface PagedSectionProps extends PagerProps {
  children: ReactNode;
  className?: string;
  /** Layout for the top pager (padding/borders to sit in the surrounding card). */
  topClassName?: string;
  /** Layout for the bottom pager. */
  bottomClassName?: string;
}

export function PagedSection({
  children,
  className,
  topClassName,
  bottomClassName,
  ...pager
}: PagedSectionProps) {
  const topRef = useRef<HTMLDivElement>(null);
  // A later page that came back empty keeps its pager, so you can step back.
  const hasRows = pager.page.totalElements > 0 || pager.page.number > 0;
  const multiPage = Math.max(pager.page.totalPages, pager.page.number + 1) > 1;

  return (
    <div className={className}>
      {hasRows && (
        <div ref={topRef} className="scroll-mt-4">
          <TablePagination {...pager} className={topClassName} />
        </div>
      )}
      {children}
      {hasRows && multiPage && (
        <TablePagination
          {...pager}
          onSizeChange={undefined}
          onPageChange={(n) => {
            pager.onPageChange?.(n);
            topRef.current?.scrollIntoView({
              block: 'start',
              behavior: 'smooth',
            });
          }}
          className={bottomClassName}
        />
      )}
    </div>
  );
}
