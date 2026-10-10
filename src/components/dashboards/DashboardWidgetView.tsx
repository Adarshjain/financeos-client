'use client';

// Dashboard widget: renders a saved report (report widgets) or a built-in
// (template built-ins run through the built-in data endpoint and render by
// templateType or a registered custom view; component built-ins such as
// bills_due and attention render their registry body, see builtins/registry),
// inside a rounded card frame. Unavailable widgets (deleted / not-owned report,
// unknown built-in) render a placeholder and never fetch. Data loading lives in
// `useWidgetData`; the header chromes live in `DashboardWidgetHeader`.
//
// The dashboard landing page prefetches the first page of every template and
// report widget's data server-side and seeds the query cache with the SAME key
// the hook uses (see `prefetchWidgetData` in `@/lib/dashboards.server`), so
// first paint there needs no client fetch at all.
//
// In edit mode the same component renders the real content but swaps its
// header for the grid drag handle, gaining a title-override input and a
// remove button.
//
// A KPI widget (saved report or template built-in, net worth included) opens
// "View underlying data" from a tap on its value — on the card and in the
// full-page view — and from the overflow menu. The dialog mounts only while
// open, so nothing is fetched until it is asked for.

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { LazyKpiUnderlyingDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import type { UnderlyingSource } from '@/components/reports/underlying/underlying.types';
import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { widgetParams, widgetTitle } from '@/lib/dashboards.helpers';
import type { WidgetParams, WidgetResponse } from '@/lib/dashboards.types';
import type { KpiData, SortClause } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

import { builtinEntryOf, templateViewOf } from './builtins/registry';
import { WidgetEditHeader, WidgetViewHeader } from './DashboardWidgetHeader';
import { useWidgetData } from './useWidgetData';
import { widgetVisualKind } from './widgetMeta';
import { WidgetReportContent, WidgetUnavailable } from './WidgetStates';

interface DashboardWidgetViewProps {
  widget: WidgetResponse;
  /** Edit-mode chrome: drag-handle header, title-override input, remove button. */
  editing?: boolean;
  onTitleChange?: (title: string | null) => void;
  onRemove?: () => void;
  /** Move the widget to its next width stop, ¼ → ½ → full (edit mode only). */
  onToggleWidth?: () => void;
  /** View mode: persists a built-in's new params from "Widget settings" (omitted = no settings item). */
  onParamsChange?: (params: WidgetParams) => Promise<void>;
  /**
   * `fill` (default) fills a fixed-height parent (grid cell, fixed stack slot);
   * `content` sizes to the content, capped with internal scroll (the mobile
   * stack's Inbox and Bills due).
   */
  fit?: 'fill' | 'content';
}

const UNAVAILABLE_BUILTIN = 'This widget is no longer available.';

/** What "View underlying data" runs: the saved report, or the template built-in with this widget's params. */
function underlyingSourceOf(widget: WidgetResponse, isBuiltin: boolean, isTemplate: boolean): UnderlyingSource | null {
  if (isBuiltin) {
    const key = widget.builtinKey ?? widget.builtin?.key ?? null;
    return isTemplate && key ? { kind: 'builtin', key, params: widgetParams(widget) } : null;
  }
  return widget.reportId ? { kind: 'saved', reportId: widget.reportId } : null;
}

export function DashboardWidgetView({
  widget,
  editing = false,
  onTitleChange,
  onRemove,
  onToggleWidth,
  onParamsChange,
  fit = 'fill',
}: DashboardWidgetViewProps) {
  const [isFullPage, setIsFullPage] = useState(false);
  const [page, setPage] = useState(0);
  // Page size is a runtime concern, driven by the table footer's control.
  const [size, setSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  // Header sort is session-only too (null = the report's own order).
  const [sort, setSort] = useState<SortClause | null>(null);
  const [underlyingOpen, setUnderlyingOpen] = useState(false);

  const { available, isBuiltin, isTemplate, data, loading, error } = useWidgetData(widget, page, size, sort);
  const kind = widgetVisualKind(widget);
  // Dim only a refetch over data already on screen; the first load shows a skeleton.
  const refetching = loading && data != null;
  // Only a saved report widget ever links to /reports/<id> (never a built-in).
  const editReportId = available && !isBuiltin ? (widget.reportId ?? null) : null;
  // Underlying data needs the KPI as shown (it heads the dialog), so it is offered once the value is in.
  const kpiData: KpiData | null = data?.type === 'KPI' ? data : null;
  const underlyingSource = available && kind === 'kpi' ? underlyingSourceOf(widget, isBuiltin, isTemplate) : null;
  const openUnderlying =
    !editing && kpiData && underlyingSource ? () => setUnderlyingOpen(true) : undefined;

  const handleSizeChange = (s: number) => {
    setSize(s);
    setPage(0);
  };

  const handleSortChange = (s: SortClause | null) => {
    setSort(s);
    setPage(0);
  };

  const renderBody = (): ReactNode => {
    if (isBuiltin && !isTemplate) {
      const Body = available ? builtinEntryOf(widget)?.Body : undefined;
      if (Body) return <Body widget={widget} params={widgetParams(widget)} className="h-full" />;
      return <WidgetUnavailable message={UNAVAILABLE_BUILTIN} />;
    }
    // A template built-in with a custom view renders its loaded data through it;
    // the shared skeleton / error / unavailable states stay below.
    const TemplateView = available && !error && data ? templateViewOf(widget) : null;
    if (TemplateView && data) {
      return (
        <TemplateView
          widget={widget}
          data={data}
          loading={loading}
          onPageChange={setPage}
          onSizeChange={handleSizeChange}
          sort={sort}
          onSortChange={handleSortChange}
          onKpiValueClick={openUnderlying}
        />
      );
    }
    return (
      <WidgetReportContent
        available={available}
        data={data}
        error={error}
        kind={kind}
        loading={loading}
        onPageChange={setPage}
        onSizeChange={handleSizeChange}
        sort={sort}
        onSortChange={handleSortChange}
        onKpiValueClick={openUnderlying}
        unavailableMessage={isBuiltin ? UNAVAILABLE_BUILTIN : undefined}
      />
    );
  };

  return (
    <>
      <Card
        className={cn(
          'flex flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900',
          fit === 'content' ? 'max-h-[420px]' : 'h-full',
          editing && 'border-emerald-500/40 ring-2 ring-emerald-500/20',
        )}
        data-testid="dashboard-widget"
      >
        {editing ? (
          <WidgetEditHeader
            widget={widget}
            available={available}
            onTitleChange={onTitleChange}
            onRemove={onRemove}
            onToggleWidth={onToggleWidth}
          />
        ) : (
          <WidgetViewHeader
            widget={widget}
            available={available}
            onExpand={() => setIsFullPage(true)}
            onViewUnderlying={openUnderlying}
            onParamsChange={onParamsChange}
          />
        )}

        <div
          className={cn(
            'min-h-0 flex-1 overflow-hidden transition-opacity',
            // Content-sized: a flex column so the built-in's own list shrinks and scrolls under the cap.
            fit === 'content' && 'flex flex-col',
            refetching && 'opacity-60',
          )}
        >
          {renderBody()}
        </div>
      </Card>

      <Dialog open={isFullPage} onOpenChange={setIsFullPage}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-background focus:outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
              <DialogTitle className="text-base font-semibold">{widgetTitle(widget)}</DialogTitle>
              <div className="flex items-center gap-1">
                {editReportId && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    asChild
                    title="Edit report"
                    aria-label="Edit report"
                  >
                    <Link href={`/reports/${editReportId}`}>
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
            <div className={cn('min-h-0 flex-1 overflow-hidden pt-2', refetching && 'opacity-60')}>
              {isFullPage && renderBody()}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {underlyingOpen && kpiData && underlyingSource && (
        <LazyKpiUnderlyingDialog
          source={underlyingSource}
          kpi={kpiData}
          title={widgetTitle(widget)}
          open
          onOpenChange={setUnderlyingOpen}
        />
      )}
    </>
  );
}
