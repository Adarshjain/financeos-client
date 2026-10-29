'use client';

// One widget on a dashboard: the Dinero Widget (title, subtitle and ⋮ menu) around the widget's content.
//   - a saved report renders with ReportResult (KPI tile, Chart, breakdown, table);
//   - a component built-in renders its own body (it fetches for itself and draws its own failed state);
//   - a template built-in renders its view with the report data the frame loaded, or ReportResult when it has none.
// Loading shows the built-in's own skeleton; a failed load shows "Couldn't load this widget" with Retry; a deleted
// report or an unknown built-in says so. One widget failing never touches the others. A widget loads (and a
// component built-in mounts its body) only once it is near the viewport; until then it shows its loading state.

import { useRouter } from 'next/navigation';
import React from 'react';

import { Text, Widget } from '@/components/ds';
import { loadWidgetSettings } from '@/features/dashboards/lazyDialogs';
import { reportHref } from '@/features/reports/list/reportsListModel';
import { LazyReportUnderlyingDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import type { UnderlyingTarget } from '@/features/reports/underlying/underlyingRequest';
import { appHref } from '@/features/shell/routes';
import { isBuiltinWidget, isWidgetAvailable, widgetParams, widgetTitle } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, WidgetResponse } from '@/lib/dashboards.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { builtinPieces } from '../builtins/registry';
import { useDuplicateBuiltinReport } from '../data/useDashboardMutations';
import { useInView } from '../data/useInView';
import { ReportWidgetBody } from './ReportWidgetBody';
import { useReportWidget } from './useReportWidget';
import { BUILTIN_GONE, isKpiBuiltinWidget, widgetBuiltinKey, widgetHref, type WidgetMenuItemId, widgetMenuItems, widgetOpensUnderlying, widgetSubtitle } from './widgetFrameModel';
import { WidgetHeaderActions } from './WidgetHeaderActions';
import type { WidgetSettingsChange } from './WidgetSettingsDialog';

export const REPORT_GONE_TITLE = 'This report is no longer available';
export const REPORT_GONE = 'It was deleted. Remove the widget or pick another report.';
export const LOAD_FAILED_TITLE = "Couldn't load this widget";

export interface DashboardWidgetFrameProps {
  widget: WidgetResponse;
  /** The built-in catalog: a built-in's params for its Widget settings. */
  catalog?: readonly BuiltinWidgetResponse[];
  /** Named in the settings dialog. */
  dashboardName?: string;
  /** Editing: no menu (the grid's own controls are on the item); the problem with the widget shows under its title. */
  editing?: boolean;
  issue?: string;
  /** View mode: saves a built-in's settings straight away. Omitted = no "Widget settings" in the menu. */
  onSaveSettings?: (change: WidgetSettingsChange) => Promise<void>;
}

type Overlay = 'underlying' | 'settings' | null;

const loadWidgetUnderlying = () => import('./WidgetUnderlying').then((m) => m.WidgetUnderlying);

export function DashboardWidgetFrame({ widget, catalog, dashboardName, editing = false, issue, onSaveSettings }: DashboardWidgetFrameProps) {
  const router = useRouter();
  const { ref, inView } = useInView();
  const state = useReportWidget(widget, inView);
  const duplicate = useDuplicateBuiltinReport();
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  // What the underlying dialog opens on: a chart entry or row's request; null = the whole report.
  const [target, setTarget] = React.useState<UnderlyingTarget | null>(null);
  const close = React.useCallback(() => setOverlay(null), []);
  // The settings and underlying-data dialogs are not in the page: each loads when opened (see useLazyDialog).
  const { Component: WidgetSettingsDialog, run: runSettings } = useLazyDialog(loadWidgetSettings);
  const { Component: WidgetUnderlying, run: runUnderlying } = useLazyDialog(loadWidgetUnderlying);

  const builtin = isBuiltinWidget(widget);
  const key = widgetBuiltinKey(widget);
  const pieces = builtin ? builtinPieces(key) : null;
  // A built-in this client does not know (version skew) has no pieces and no report to fall back on: unavailable.
  const available = isWidgetAvailable(widget) && !(builtin && !pieces && !widget.reportId);
  const def = (key ? catalog?.find((d) => d.key === key) : null) ?? null;
  const href = widgetHref(widget);
  const canEditSettings = !editing && onSaveSettings != null && def != null;
  const items = editing ? [] : widgetMenuItems(widget, { canEditSettings });
  // The KPI figure, chart entries and rows open the underlying data (a KPI's only way in; the ⋮ menu has it for the rest).
  const canOpenUnderlying = !editing && widgetOpensUnderlying(widget);
  // A KPI built-in lists its rows from the built-in's own endpoint (key + params), not a saved report.
  const kpiBuiltin = isKpiBuiltinWidget(widget);

  // A component built-in fetches for itself; every other widget is loaded here.
  const loadsHere = available && (builtin ? widget.builtin?.kind === 'template' : Boolean(widget.reportId));
  // Out of view: the loading state, and nothing fetched (a component built-in's body is not mounted).
  const loading = available && (!inView || (loadsHere && !state.data && !state.error));
  const failed = loadsHere && state.error ? state.error : undefined;

  const openUnderlying = (next: UnderlyingTarget | null = null) => {
    const show = () => {
      setTarget(next);
      setOverlay('underlying');
    };
    // A KPI built-in has its own lazy dialog; the others wait for WidgetUnderlying's code.
    if (kpiBuiltin) show();
    else void runUnderlying(show);
  };

  const select = (item: WidgetMenuItemId) => {
    if (item === 'edit-report' && widget.reportId) router.push(reportHref(widget.reportId));
    else if (item === 'settings') void runSettings(() => setOverlay('settings'));
    else if (item === 'duplicate' && key) duplicate.mutate({ builtinKey: key, params: widgetParams(widget) });
    else if (item === 'full-page') {
      if (href) router.push(appHref(href));
    } else if (item === 'underlying') openUnderlying();
  };

  const content = (() => {
    if (!available) return null;
    if (builtin) {
      if (pieces?.Body) return <pieces.Body widget={widget} params={widgetParams(widget)} />;
      if (!state.data) return null;
      if (pieces?.View) {
        return (
          <pieces.View
            widget={widget}
            data={state.data}
            loading={state.loading}
            onPageChange={state.setPage}
            onSizeChange={state.setSize}
            sort={state.sort}
            onSortChange={state.setSort}
            onKpiValueClick={canOpenUnderlying && kpiBuiltin ? () => openUnderlying() : undefined}
          />
        );
      }
    }
    return (
      <ReportWidgetBody
        widget={widget}
        state={state}
        onOpenUnderlying={canOpenUnderlying ? () => openUnderlying() : undefined}
        onOpenUnderlyingTarget={canOpenUnderlying ? openUnderlying : undefined}
      />
    );
  })();

  const subtitle = issue ? (
    <Text variant="caption" tone="danger">
      {issue}
    </Text>
  ) : (
    widgetSubtitle(widget)
  );

  return (
    <>
      <Widget
        ref={ref}
        data-testid="dashboard-widget"
        data-widget-id={widget.id}
        title={widgetTitle(widget)}
        subtitle={subtitle}
        menu={
          editing ? undefined : (
            <WidgetHeaderActions
              items={items}
              duplicating={duplicate.isPending}
              onSelect={select}
            />
          )
        }
        flush={pieces?.flush}
        loading={loading}
        loadingSkeleton={pieces ? <pieces.Skeleton /> : undefined}
        error={failed}
        errorTitle={LOAD_FAILED_TITLE}
        action={failed ? { label: 'Retry', onSelect: () => void state.refetch() } : undefined}
        unavailable={available ? undefined : builtin ? BUILTIN_GONE : REPORT_GONE}
        unavailableTitle={available || builtin ? undefined : REPORT_GONE_TITLE}
      >
        {content}
      </Widget>
      {overlay === 'underlying' && kpiBuiltin && key ? (
        <LazyReportUnderlyingDialog
          builtin={{ kind: 'builtin', key, params: widgetParams(widget) }}
          title={`Underlying data · ${widgetTitle(widget)}`}
          onClose={close}
        />
      ) : null}
      {overlay === 'underlying' && !kpiBuiltin && WidgetUnderlying ? <WidgetUnderlying widget={widget} data={state.data} target={target} onClose={close} /> : null}
      {overlay === 'settings' && def && onSaveSettings && WidgetSettingsDialog ? (
        <WidgetSettingsDialog widget={widget} def={def} dashboardName={dashboardName} onSave={onSaveSettings} onClose={close} />
      ) : null}
    </>
  );
}
