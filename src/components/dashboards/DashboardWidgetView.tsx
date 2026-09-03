'use client';

// Dashboard widget: fetches its referenced report's data (via useQuery, keyed
// by widget id + page/size) and renders it with the shared report views,
// sized to fill the widget. Unavailable widgets (deleted / not-owned report)
// render a placeholder and never fetch.
//
// The dashboard landing page prefetches the first page of every widget's data
// server-side and seeds the query cache with the SAME key this hook uses (see
// `prefetchWidgetData` in `@/lib/dashboards.server`), so first paint there
// needs no client fetch at all.
//
// In edit mode the same component renders the real report but swaps its header
// for the grid drag handle, gaining a title-override input and a remove button.

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { api, ApiError } from '@/lib/api/client';
import { DASHBOARD_GRID_COLUMNS, widgetQueryParams } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import { asReportData } from '@/lib/reports.helpers';
import { cn } from '@/lib/utils';

import {
  WidgetEditHeader,
  WidgetReportContent,
  WidgetReportContentProps,
  widgetTitle,
  WidgetViewHeader,
} from './DashboardWidgetHeader';

interface DashboardWidgetViewProps {
  widget: WidgetResponse;
  /** Edit-mode chrome: drag-handle header, title-override input, remove button. */
  editing?: boolean;
  onTitleChange?: (title: string | null) => void;
  onRemove?: () => void;
  /** Toggle the widget between half and full grid width (edit mode only). */
  onToggleWidth?: () => void;
}

export function DashboardWidgetView({
                                      widget,
                                      editing = false,
                                      onTitleChange,
                                      onRemove,
                                      onToggleWidth,
                                    }: DashboardWidgetViewProps) {
  const available = widget.report.available;
  const isTable = widget.report.type === 'TABLE';
  const isFullWidth = widget.layout.w >= DASHBOARD_GRID_COLUMNS;

  const [isFullPage, setIsFullPage] = useState(false);
  const [page, setPage] = useState(0);
  // Page size is a runtime concern, driven by the table footer's control.
  const [size, setSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  // The widget's own id is the cache identity; `widgetQueryParams` folds in
  // everything else the queryFn reads (reportId, isTable, page, size) so the
  // key stays exhaustive — and matches the landing page's server prefetch,
  // which builds the same params for the same widget id (see
  // `prefetchWidgetData` in `@/lib/dashboards.server`).
  const query = useQuery({
    queryKey: keys.dashboards.widget(
      widget.id,
      widgetQueryParams(widget.reportId, isTable, page, size),
    ),
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/reports/{id}/data', {
        params: { path: { id: widget.reportId }, query: isTable ? { page, size } : {} },
      });
      return asReportData(data);
    },
    enabled: available,
    placeholderData: keepPreviousData,
  });

  const data = query.data ?? null;
  const loading = query.isFetching;
  const error = query.isError
    ? query.error instanceof ApiError
      ? query.error.response.message
      : 'Failed to run report'
    : null;

  const handleSizeChange = (s: number) => {
    setSize(s);
    setPage(0);
  };

  const sharedContentProps: WidgetReportContentProps = {
    available,
    data,
    error,
    loading,
    onPageChange: setPage,
    onSizeChange: handleSizeChange,
  };

  return (
    <>
      <Card
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-md border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/60',
          editing && 'ring-2 ring-emerald-500/20 border-emerald-500/30',
        )}
      >
        {editing ? (
          <WidgetEditHeader
            widget={widget}
            available={available}
            isFullWidth={isFullWidth}
            onTitleChange={onTitleChange}
            onRemove={onRemove}
            onToggleWidth={onToggleWidth}
          />
        ) : (
          <WidgetViewHeader widget={widget} available={available} onExpand={() => setIsFullPage(true)} />
        )}

        <div className={cn('min-h-0 flex-1 overflow-hidden', loading && 'opacity-60')}>
          <WidgetReportContent {...sharedContentProps} />
        </div>
      </Card>

      <Dialog open={isFullPage} onOpenChange={setIsFullPage}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-background focus:outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
              <DialogTitle className="text-base font-semibold">{widgetTitle(widget)}</DialogTitle>
              <div className="flex items-center gap-1">
                {available && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    asChild
                    title="Edit report"
                    aria-label="Edit report"
                  >
                    <Link href={`/reports/${widget.reportId}`}>
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Link>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0"
                  onClick={() => setIsFullPage(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className={cn('min-h-0 flex-1 overflow-hidden', loading && 'opacity-60')}>
              <WidgetReportContent {...sharedContentProps} />
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
