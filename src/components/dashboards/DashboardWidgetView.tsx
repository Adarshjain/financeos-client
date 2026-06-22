'use client';

// Dashboard widget: fetches its referenced report's data via the reports client
// (runSavedReport) and renders it with the shared report views, sized to fill
// the widget. Unavailable widgets (deleted / not-owned report) render a
// placeholder and never fetch.
//
// In edit mode the same component renders the real report but swaps its header
// for the grid drag handle, gaining a title-override input and a remove button.

import { AlertTriangle, ChevronsRightLeft, GripVertical, Loader2, SeparatorVertical, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { runSavedReport } from '@/actions/reports';
import { ChartView } from '@/components/reports/views/ChartView';
import { KpiView } from '@/components/reports/views/KpiView';
import { PivotTableView } from '@/components/reports/views/PivotTableView';
import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { TableView } from '@/components/reports/views/TableView';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DASHBOARD_GRID_COLUMNS } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { isChartData, isKpiData, isPivotTableData, isRawTableData } from '@/lib/reports.helpers';
import type { ReportData } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

function widgetTitle(widget: WidgetResponse): string {
  return widget.title ?? widget.report.name ?? 'Untitled report';
}

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

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  // Page size is a runtime concern, driven by the table footer's control.
  const [size, setSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const runIdRef = useRef(0);

  const handleSizeChange = (s: number) => {
    setSize(s);
    setPage(0);
  };

  useEffect(() => {
    if (!available) return;
    const myId = ++runIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await runSavedReport(
        widget.reportId,
        isTable ? { page, size } : {},
      );
      if (myId !== runIdRef.current) return;
      setLoading(false);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setData(null);
        setError(res.error.message);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [widget.reportId, available, isTable, page, size]);

  // Keep header controls from starting a grid drag/resize.
  const stopDrag = (e: React.MouseEvent | React.TouchEvent) =>
    e.stopPropagation();

  return (
    <Card
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-md',
        editing && 'ring-2 ring-emerald-500/20',
      )}
    >
      {editing ? (
        <div
          className="dashboard-drag-handle flex cursor-move items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-[3px] dark:border-slate-800 dark:bg-slate-800/50">
          <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
          <Input
            className="h-7 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
            placeholder={widget.report.name ?? 'Report'}
            value={widget.title ?? ''}
            onChange={(e) => onTitleChange?.(e.currentTarget.value || null)}
            onMouseDown={stopDrag}
            onTouchStart={stopDrag}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onToggleWidth}
            onMouseDown={stopDrag}
            onTouchStart={stopDrag}
            title={
              isFullWidth ? 'Collapse to half width' : 'Expand to full width'
            }
          >
            {isFullWidth ? (
              <ChevronsRightLeft className="h-4 w-4" />
            ) : (
              <SeparatorVertical className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onRemove}
            onMouseDown={stopDrag}
            onTouchStart={stopDrag}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {widgetTitle(widget)}
          </span>
        </div>
      )}

      <div
        className={cn(
          'min-h-0 flex-1 overflow-hidden',
          loading && 'opacity-60',
        )}
      >
        {!available ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            This report is no longer available.
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : !data ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : isKpiData(data) ? (
          <KpiView className="h-full overflow-auto p-3" data={data} />
        ) : isChartData(data) ? (
          <div className="h-full p-2">
            <ChartView data={data} fill />
          </div>
        ) : isRawTableData(data) ? (
          <TableView
            data={data}
            fill
            onPageChange={setPage}
            onSizeChange={handleSizeChange}
          />
        ) : isPivotTableData(data) ? (
          <PivotTableView
            data={data}
            fill
            onPageChange={setPage}
            onSizeChange={handleSizeChange}
          />
        ) : null}
      </div>
    </Card>
  );
}
