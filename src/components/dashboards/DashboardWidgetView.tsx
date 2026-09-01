'use client';

// Dashboard widget: fetches its referenced report's data via the reports client
// (runSavedReport) and renders it with the shared report views, sized to fill
// the widget. Unavailable widgets (deleted / not-owned report) render a
// placeholder and never fetch.
//
// In edit mode the same component renders the real report but swaps its header
// for the grid drag handle, gaining a title-override input and a remove button.

import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  ChevronsRightLeft,
  GripVertical,
  Loader2,
  Maximize2,
  Pencil,
  SeparatorVertical,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { runSavedReport } from '@/actions/reports';
import { ReportDataView } from '@/components/reports/views/ReportDataView';
import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DASHBOARD_GRID_COLUMNS } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { ReportData } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

function widgetTitle(widget: WidgetResponse): string {
  return widget.title ?? widget.report.name ?? 'Untitled report';
}

interface WidgetReportContentProps {
  available: boolean;
  data: ReportData | null;
  error: string | null;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  /** Disables the table/pivot paging controls while a page fetch is in flight. */
  loading?: boolean;
}

function WidgetReportContent({ available, data, error, onPageChange, onSizeChange, loading }: WidgetReportContentProps) {
  if (!available) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        This report is no longer available.
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-rose-600 dark:text-rose-400">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  return <ReportDataView data={data} fill loading={loading} onPageChange={onPageChange} onSizeChange={onSizeChange} />;
}

interface DashboardWidgetViewProps {
  widget: WidgetResponse;
  /** Edit-mode chrome: drag-handle header, title-override input, remove button. */
  editing?: boolean;
  onTitleChange?: (title: string | null) => void;
  onRemove?: () => void;
  /** Toggle the widget between half and full grid width (edit mode only). */
  onToggleWidth?: () => void;
  /**
   * Report data already fetched on the server for this widget's first page.
   *
   * Without it, every widget mounted empty and fetched its own data from a
   * useEffect, so a dashboard cost SSR shell -> hydrate -> mount -> N
   * client-to-server round trips before showing anything. When present the
   * widget renders immediately and only fetches again if the user pages or
   * changes page size.
   */
  initialData?: ReportData | null;
  /** Server-side fetch error for this widget, isolated from its siblings. */
  initialError?: string | null;
}

export function DashboardWidgetView({
                                      widget,
                                      editing = false,
                                      onTitleChange,
                                      onRemove,
                                      onToggleWidth,
                                      initialData = null,
                                      initialError = null,
                                    }: DashboardWidgetViewProps) {
  const available = widget.report.available;
  const isTable = widget.report.type === 'TABLE';
  const isFullWidth = widget.layout.w >= DASHBOARD_GRID_COLUMNS;

  const [isFullPage, setIsFullPage] = useState(false);
  const [data, setData] = useState<ReportData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [page, setPage] = useState(0);
  // Page size is a runtime concern, driven by the table footer's control.
  const [size, setSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const runIdRef = useRef(0);

  // Which (report, page, size) the currently-held data belongs to. Seeded when
  // the server already fetched this widget's first page so the effect below
  // doesn't immediately re-request identical data on mount.
  const dataSignature = (p: number, sz: number) =>
    isTable ? `${widget.reportId}|${p}|${sz}` : widget.reportId;
  const loadedSignatureRef = useRef<string | null>(
    initialData || initialError ? dataSignature(0, DEFAULT_TABLE_PAGE_SIZE) : null,
  );

  const handleSizeChange = (s: number) => {
    setSize(s);
    setPage(0);
  };

  useEffect(() => {
    if (!available) return;
    const signature = dataSignature(page, size);
    // Already holding exactly this data (server-seeded, or fetched earlier).
    if (loadedSignatureRef.current === signature) return;

    const myId = ++runIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await runSavedReport(
        widget.reportId,
        isTable ? { page, size } : {},
      );
      if (myId !== runIdRef.current) return;
      setLoading(false);
      loadedSignatureRef.current = signature;
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setData(null);
        setError(res.error.message);
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.reportId, available, isTable, page, size]);

  // Keep header controls from starting a grid drag/resize.
  const stopDrag = (e: React.MouseEvent | React.TouchEvent) =>
    e.stopPropagation();

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
          <div
            className="dashboard-drag-handle flex cursor-move items-center gap-1 border-b border-slate-200 bg-slate-50/50 px-2 py-[3px] dark:border-slate-850 dark:bg-slate-800/40">
            <GripVertical className="h-4 w-4 shrink-0 text-slate-400 cursor-grab active:cursor-grabbing" />
            <Input
              className="h-7 border-0 bg-transparent px-1 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-none focus-visible:ring-0"
              placeholder={widget.report.name ?? 'Report'}
              value={widget.title ?? ''}
              onChange={(e) => onTitleChange?.(e.currentTarget.value || null)}
              onMouseDown={stopDrag}
              onTouchStart={stopDrag}
            />
            {available && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                asChild
                title="Edit report"
                aria-label="Edit report"
                onMouseDown={stopDrag}
                onTouchStart={stopDrag}
              >
                <Link href={`/reports/${widget.reportId}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="shrink-0"
              onClick={onToggleWidth}
              onMouseDown={stopDrag}
              onTouchStart={stopDrag}
              title={isFullWidth ? 'Collapse to half width' : 'Expand to full width'}
            >
              {isFullWidth ? (
                <ChevronsRightLeft className="h-4 w-4 text-slate-500" />
              ) : (
                <SeparatorVertical className="h-4 w-4 text-slate-500" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="shrink-0 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
              onClick={onRemove}
              onMouseDown={stopDrag}
              onTouchStart={stopDrag}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="group flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-850">
            <span className="truncate text-xs font-black uppercase text-slate-800 dark:text-slate-200">
              {widgetTitle(widget)}
            </span>
            {available && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                  asChild
                  title="Edit report"
                  aria-label="Edit report"
                >
                  <Link href={`/reports/${widget.reportId}`}>
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                  onClick={() => setIsFullPage(true)}
                  title="View full page"
                  aria-label="View full page"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                </Button>
              </div>
            )}
          </div>
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
