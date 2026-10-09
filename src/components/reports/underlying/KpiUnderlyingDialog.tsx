'use client';

// "View underlying data" for a KPI: the rows its value is computed from, for
// this period or (when the KPI compares) the previous one, server-sorted and
// server-paged, with the KPI's filters as chips and the aggregate restated
// under the table. Rows open a transaction or swap the body to that row's
// breakdown (Back returns). Download CSV exports every row in the same order.
//
// Wide centred dialog on desktop, the standard bottom sheet on mobile; the
// table scrolls sideways inside the body. Sort, page and period are local to
// one opening (the content unmounts on close, so the next opening starts fresh).
// The table dims while a page or sort loads; a failed one keeps the last good
// table under the error so the pager and headers can still move on or retry.

import { useState } from 'react';

import { TableView } from '@/components/reports/views/TableView';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatDateRange, formatDateRangeFull } from '@/lib/date-range';
import { asReportData, isRawTableData } from '@/lib/reports.helpers';
import type { KpiData, SortClause, TableRow } from '@/lib/reports.types';
import { toastError } from '@/lib/toastError';
import { cn } from '@/lib/utils';

import { RowBreakdownView } from './RowBreakdownView';
import {
  formatKpiValue,
  saveBlob,
  UNDERLYING_PAGE_SIZE,
  underlyingCsvFilename,
} from './underlying.helpers';
import type {
  BreakdownFrame,
  KpiUnderlyingResponse,
  UnderlyingPeriod,
  UnderlyingSource,
} from './underlying.types';
import {
  NotCountedDisclosure,
  UnderlyingFilterChips,
  UnderlyingPeriodTabs,
  UnderlyingSummary,
} from './UnderlyingParts';
import { UnderlyingTransactionDialog } from './UnderlyingTransactionDialog';
import { fetchUnderlyingCsv, useKpiUnderlying } from './useKpiUnderlying';

export interface KpiUnderlyingDialogProps {
  source: UnderlyingSource;
  /** The KPI as shown on the tile; its value and ranges head the dialog. */
  kpi: KpiData;
  /** Report / widget name. */
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KpiUnderlyingDialog({ source, kpi, title, open, onOpenChange }: KpiUnderlyingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" aria-describedby={undefined}>
        <UnderlyingContent source={source} kpi={kpi} title={title} />
      </DialogContent>
    </Dialog>
  );
}

function UnderlyingContent({ source, kpi, title }: Pick<KpiUnderlyingDialogProps, 'source' | 'kpi' | 'title'>) {
  const [period, setPeriod] = useState<UnderlyingPeriod>('current');
  const [sort, setSort] = useState<SortClause | null>(null);
  const [page, setPage] = useState(0);
  const [stack, setStack] = useState<BreakdownFrame[]>([]);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const query = useKpiUnderlying(source, { period, page, size: UNDERLYING_PAGE_SIZE, sort });
  // The last page that loaded. A failed page or sort fetch leaves the query with
  // no data, so this keeps the table (and its pager) on screen under the error.
  const [lastData, setLastData] = useState<KpiUnderlyingResponse | null>(null);
  if (query.data && query.data !== lastData) setLastData(query.data);
  const shown = query.data ?? lastData;
  // While another period loads, the kept page belongs to the old period: hide it.
  const data = shown && shown.period === period ? shown : null;

  const comparison = kpi.comparison;
  const isPrevious = period === 'previous';
  const headerValue = isPrevious ? (comparison?.previousValue ?? null) : kpi.value;
  const headerRange = isPrevious ? (comparison?.previousDateRange ?? null) : kpi.meta.dateRange;
  const fmt = (value: number | null) => formatKpiValue(value, kpi);

  const changePeriod = (next: UnderlyingPeriod) => {
    setPeriod(next);
    setPage(0);
  };
  const changeSort = (next: SortClause | null) => {
    setSort(next);
    setPage(0);
  };
  // After a failed page fetch the pager shows the last good page, so asking
  // for the failed page again is a retry.
  const changePage = (next: number) => {
    if (next === page && query.isError) void query.refetch();
    else setPage(next);
  };

  const download = async () => {
    try {
      const blob = await fetchUnderlyingCsv(source, { period, sort });
      saveBlob(blob, underlyingCsvFilename(title, headerRange));
    } catch (e) {
      toastError(e, 'Failed to download CSV');
    }
  };

  const onRowClick = (row: TableRow) => {
    if (row.id == null) return;
    const id = String(row.id);
    if (data?.rowAction === 'transaction') setTransactionId(id);
    else if (data?.rowAction === 'breakdown') setStack([{ datasource: data.datasource, rowId: id }]);
  };
  const rowsClickable = data?.rowAction === 'transaction' || data?.rowAction === 'breakdown';
  const top = stack[stack.length - 1];
  const table = data ? asReportData(data.table) : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 sm:justify-start">
          <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {fmt(headerValue)}
          </span>
          {headerRange && (
            <span className="text-xs text-slate-500" title={formatDateRangeFull(headerRange.from, headerRange.to)}>
              {formatDateRange(headerRange.from, headerRange.to)}
            </span>
          )}
        </div>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {top ? (
          <RowBreakdownView
            key={`${stack.length}:${top.rowId}`}
            datasource={top.datasource}
            rowId={top.rowId}
            onBack={() => setStack((s) => s.slice(0, -1))}
            onOpenTransaction={setTransactionId}
            onOpenBreakdown={(frame) => setStack((s) => [...s, frame])}
          />
        ) : (
          <>
            {comparison && (
              <UnderlyingPeriodTabs
                period={period}
                onPeriodChange={changePeriod}
                previousRange={comparison.previousDateRange}
                previousValueText={comparison.previousValue != null ? fmt(comparison.previousValue) : null}
              />
            )}
            {query.isError && !data ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {getErrorMessage(query.error, 'Failed to load the underlying data')}
              </p>
            ) : !data || !table ? (
              <div className="space-y-2" data-testid="underlying-loading">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <>
                <UnderlyingFilterChips filters={data.filters} />
                <NotCountedDisclosure items={data.notCounted} format={data.format} />
                {data.rowCount === 0 || !isRawTableData(table) ? (
                  <p className="py-6 text-center text-sm text-slate-500">No rows in this period</p>
                ) : (
                  <div className={cn(query.isFetching && 'opacity-60 transition-opacity')}>
                    <TableView
                      data={table}
                      sort={sort}
                      onSortChange={changeSort}
                      onPageChange={changePage}
                      loading={query.isFetching}
                      onRowClick={rowsClickable ? onRowClick : undefined}
                      // Group headers only make sense in the grouped default order.
                      groupField={data.sortKey == null ? data.groupField : null}
                    />
                  </div>
                )}
                {query.isError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {getErrorMessage(query.error, 'Failed to load the underlying data')}
                  </p>
                )}
                <UnderlyingSummary data={data} />
              </>
            )}
          </>
        )}
      </DialogBody>

      <DialogFooter primaryAction={{ label: 'Download CSV', onClick: download }} secondaryAction={{ label: 'Close' }} />

      <UnderlyingTransactionDialog transactionId={transactionId} onClose={() => setTransactionId(null)} />
    </>
  );
}
