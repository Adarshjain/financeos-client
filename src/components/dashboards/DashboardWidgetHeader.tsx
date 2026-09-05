// Presentational pieces of DashboardWidgetView: the widget's report content
// (loading/error/unavailable/data states) and its two header chromes — the
// drag-handle edit-mode header and the plain view-mode header. Split out to
// keep DashboardWidgetView.tsx focused on data-fetching + layout orchestration.

import {
  AlertTriangle,
  ChevronsRightLeft,
  GripVertical,
  Loader2,
  Maximize2,
  Pencil,
  SeparatorVertical,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

import { ReportDataView } from '@/components/reports/views/ReportDataView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { ReportData } from '@/lib/reports.types';

export function widgetTitle(widget: WidgetResponse): string {
  return widget.title?.trim() || widget.report?.name || 'Untitled report';
}

// Keep header controls from starting a grid drag/resize.
function stopDrag(e: React.MouseEvent | React.TouchEvent) {
  e.stopPropagation();
}

export interface WidgetReportContentProps {
  available: boolean;
  data: ReportData | null;
  error: string | null;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  /** Disables the table/pivot paging controls while a page fetch is in flight. */
  loading?: boolean;
}

export function WidgetReportContent({ available, data, error, onPageChange, onSizeChange, loading }: WidgetReportContentProps) {
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

interface WidgetEditHeaderProps {
  widget: WidgetResponse;
  available: boolean;
  isFullWidth: boolean;
  onTitleChange?: (title: string | null) => void;
  onRemove?: () => void;
  onToggleWidth?: () => void;
}

/** Edit-mode chrome: drag-handle header, title-override input, remove button. */
export function WidgetEditHeader({
  widget,
  available,
  isFullWidth,
  onTitleChange,
  onRemove,
  onToggleWidth,
}: WidgetEditHeaderProps) {
  return (
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
  );
}

interface WidgetViewHeaderProps {
  widget: WidgetResponse;
  available: boolean;
  onExpand: () => void;
}

/** Plain (non-editing) header: title, edit-report link, expand-to-full-page. */
export function WidgetViewHeader({ widget, available, onExpand }: WidgetViewHeaderProps) {
  return (
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
            onClick={onExpand}
            title="View full page"
            aria-label="View full page"
          >
            <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
          </Button>
        </div>
      )}
    </div>
  );
}
