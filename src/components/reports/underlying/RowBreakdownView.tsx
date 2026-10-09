'use client';

// How one listed row's value is made up (net worth account, holding…). Swaps
// in for the underlying table inside the same dialog; Back returns a level.
// Each section is its own paginated table: page 0 comes with the breakdown,
// later pages from the section endpoint. Headers sort the whole section on the
// server (asc → desc → default; session-only, back to page 1 on change); the
// embedded page is used only for the unsorted first page. Section rows open a
// transaction or a nested breakdown (e.g. a broker's holding → its positions).

import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';

import { TableView } from '@/components/reports/views/TableView';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { asReportData, isRawTableData } from '@/lib/reports.helpers';
import type { SortClause, TableRow } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

import { BreakdownSteps } from './BreakdownSteps';
import { formatAmount, UNDERLYING_PAGE_SIZE } from './underlying.helpers';
import type { BreakdownFrame, BreakdownSectionData } from './underlying.types';
import { useBreakdownSection, useRowBreakdown } from './useRowBreakdown';

export interface BreakdownRowHandlers {
  onOpenTransaction: (id: string) => void;
  onOpenBreakdown: (frame: BreakdownFrame) => void;
}

interface RowBreakdownViewProps extends BreakdownRowHandlers {
  datasource: string;
  rowId: string;
  onBack: () => void;
}

export function RowBreakdownView({
  datasource,
  rowId,
  onBack,
  onOpenTransaction,
  onOpenBreakdown,
}: RowBreakdownViewProps) {
  const query = useRowBreakdown(datasource, rowId);
  const error = query.error;
  const data = query.data;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="xs" className="-ml-2" onClick={onBack}>
        <ChevronLeft />
        Back
      </Button>

      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          {getErrorMessage(error, 'Failed to load the breakdown')}
        </p>
      ) : !data ? (
        <div className="space-y-2" data-testid="breakdown-loading">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{data.title}</h3>
            {(data.subtitle || data.kindLabel) && (
              <p className="text-xs text-slate-500">
                {[data.subtitle, data.kindLabel].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {data.totalLabel}{' '}
              <span className="font-semibold tabular-nums">{formatAmount(data.total, data.format)}</span>
            </p>
          </div>

          <BreakdownSteps steps={data.steps} />

          {data.sections.map((section) => (
            <BreakdownSectionTable
              key={section.key}
              datasource={data.datasource}
              rowId={data.rowId}
              section={section}
              onOpenTransaction={onOpenTransaction}
              onOpenBreakdown={onOpenBreakdown}
            />
          ))}

          {data.notes.length > 0 && (
            <ul className="space-y-1 text-xs text-slate-500">
              {data.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

interface BreakdownSectionTableProps extends BreakdownRowHandlers {
  datasource: string;
  rowId: string;
  section: BreakdownSectionData;
}

function BreakdownSectionTable({
  datasource,
  rowId,
  section,
  onOpenTransaction,
  onOpenBreakdown,
}: BreakdownSectionTableProps) {
  const first = asReportData(section.table);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortClause | null>(null);
  const size = isRawTableData(first) ? first.page.size : UNDERLYING_PAGE_SIZE;
  const embedded = page === 0 && sort == null;
  const later = useBreakdownSection(datasource, rowId, section.key, page, size, sort);
  const current = embedded ? first : later.data;
  // The last page shown stays up (dimmed) while the next page or sort loads,
  // and under the error when it fails, so the pager and headers never unmount
  // mid-click. The embedded page has no query of its own to keep as
  // placeholder data, hence the explicit memory.
  const [lastShown, setLastShown] = useState(first);
  if (current && current !== lastShown) setLastShown(current);
  const table = current ?? lastShown;
  const pageError = embedded ? null : later.error;

  const changeSort = (next: SortClause | null) => {
    setSort(next);
    setPage(0);
  };

  // After a failed page the pager shows the last good page, so asking for the
  // failed page again is a retry.
  const changePage = (next: number) => {
    if (next === page && pageError) void later.refetch();
    else setPage(next);
  };

  const onRowClick = rowClickHandler(section, { onOpenTransaction, onOpenBreakdown });

  return (
    <section className="space-y-2" aria-label={section.label}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{section.label}</h4>
      {isRawTableData(table) ? (
        <div className={cn(later.isFetching && 'opacity-60 transition-opacity')}>
          <TableView
            data={table}
            loading={later.isFetching}
            sort={sort}
            onSortChange={changeSort}
            onPageChange={changePage}
            onRowClick={onRowClick}
          />
        </div>
      ) : (
        <Skeleton className="h-24 w-full" />
      )}
      {pageError && (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          {getErrorMessage(pageError, 'Failed to load this page')}
        </p>
      )}
    </section>
  );
}

function rowClickHandler(
  section: BreakdownSectionData,
  { onOpenTransaction, onOpenBreakdown }: BreakdownRowHandlers,
): ((row: TableRow) => void) | undefined {
  if (section.rowAction === 'transaction') {
    return (row) => {
      if (row.id != null) onOpenTransaction(String(row.id));
    };
  }
  if (section.rowAction === 'breakdown' && section.rowBreakdownDatasource) {
    const nested = section.rowBreakdownDatasource;
    return (row) => {
      if (row.id != null) onOpenBreakdown({ datasource: nested, rowId: String(row.id) });
    };
  }
  return undefined;
}
