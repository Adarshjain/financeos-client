'use client';

// View-mode widget: fetches its referenced report's data via the reports client
// (runSavedReport) and renders it with the shared report views. Unavailable
// widgets (deleted / not-owned report) render a placeholder and never fetch.

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { runSavedReport } from '@/actions/reports';
import { ChartView } from '@/components/reports/views/ChartView';
import { KpiView } from '@/components/reports/views/KpiView';
import { PivotTableView } from '@/components/reports/views/PivotTableView';
import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { TableView } from '@/components/reports/views/TableView';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { WidgetResponse } from '@/lib/dashboards.types';
import {
  isChartData,
  isKpiData,
  isPivotTableData,
  isRawTableData,
} from '@/lib/reports.helpers';
import type { ReportData } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

function widgetTitle(widget: WidgetResponse): string {
  return widget.title ?? widget.report.name ?? 'Untitled report';
}

export function DashboardWidgetView({ widget }: { widget: WidgetResponse }) {
  const available = widget.report.available;
  const isTable = widget.report.type === 'TABLE';

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

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {widgetTitle(widget)}
        </span>
        {widget.report.type && (
          <Badge variant="secondary" className="shrink-0">
            {widget.report.type}
          </Badge>
        )}
      </div>

      <div className={cn('min-h-0 flex-1 overflow-auto p-3', loading && 'opacity-60')}>
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
          <KpiView data={data} />
        ) : isChartData(data) ? (
          <ChartView data={data} />
        ) : isRawTableData(data) ? (
          <TableView
            data={data}
            onPageChange={setPage}
            onSizeChange={handleSizeChange}
          />
        ) : isPivotTableData(data) ? (
          <PivotTableView
            data={data}
            onPageChange={setPage}
            onSizeChange={handleSizeChange}
          />
        ) : null}
      </div>
    </Card>
  );
}
