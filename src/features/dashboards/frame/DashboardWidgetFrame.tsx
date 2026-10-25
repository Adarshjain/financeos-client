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
import { reportHref } from '@/features/reports/list/reportsList';
import { appHref } from '@/features/shell/routes';
import { isBuiltinWidget, isWidgetAvailable, widgetParams, widgetTitle } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, WidgetResponse } from '@/lib/dashboards.types';

import { builtinPieces } from '../builtins/registry';
import { useInView } from '../data/useInView';
import { ReportWidgetBody } from './ReportWidgetBody';
import { useDuplicateBuiltinReport } from './useDuplicateBuiltinReport';
import { useReportWidget } from './useReportWidget';
import { BUILTIN_GONE, widgetBuiltinKey, widgetHref, type WidgetMenuItemId, widgetMenuItems, widgetSubtitle } from './widgetFrame.model';
import { WidgetFullPage } from './WidgetFullPage';
import { WidgetHeaderActions } from './WidgetHeaderActions';
import { type WidgetSettingsChange, WidgetSettingsDialog } from './WidgetSettingsDialog';
import { WidgetUnderlying } from './WidgetUnderlying';

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

type Overlay = 'full' | 'underlying' | 'settings' | null;

export function DashboardWidgetFrame({ widget, catalog, dashboardName, editing = false, issue, onSaveSettings }: DashboardWidgetFrameProps) {
  const router = useRouter();
  const { ref, inView } = useInView();
  const state = useReportWidget(widget, inView);
  const duplicate = useDuplicateBuiltinReport();
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const close = React.useCallback(() => setOverlay(null), []);

  const builtin = isBuiltinWidget(widget);
  const key = widgetBuiltinKey(widget);
  const pieces = builtin ? builtinPieces(key) : null;
  // A built-in this client does not know (version skew) has no pieces and no report to fall back on: unavailable.
  const available = isWidgetAvailable(widget) && !(builtin && !pieces && !widget.reportId);
  const def = (key ? catalog?.find((d) => d.key === key) : null) ?? null;
  const href = widgetHref(widget);
  const canEditSettings = !editing && onSaveSettings != null && def != null;
  const items = editing ? [] : widgetMenuItems(widget, { canEditSettings });
  // The KPI figure opens the same underlying data as the ⋮ menu's item.
  const canOpenUnderlying = items.includes('underlying');

  // A component built-in fetches for itself; every other widget is loaded here.
  const loadsHere = available && (builtin ? widget.builtin?.kind === 'template' : Boolean(widget.reportId));
  // Out of view: the loading state, and nothing fetched (a component built-in's body is not mounted).
  const loading = available && (!inView || (loadsHere && !state.data && !state.error));
  const failed = loadsHere && state.error ? state.error : undefined;

  const select = (item: WidgetMenuItemId) => {
    if (item === 'edit-report' && widget.reportId) router.push(reportHref(widget.reportId));
    else if (item === 'settings') setOverlay('settings');
    else if (item === 'duplicate' && key) duplicate.mutate({ builtinKey: key, params: widgetParams(widget) });
    else if (item === 'full-page') {
      if (builtin && href) router.push(appHref(href));
      else setOverlay('full');
    } else if (item === 'underlying') setOverlay('underlying');
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
          />
        );
      }
    }
    return <ReportWidgetBody widget={widget} state={state} onOpenUnderlying={canOpenUnderlying ? () => setOverlay('underlying') : undefined} />;
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
      {overlay === 'full' ? <WidgetFullPage widget={widget} onClose={close} /> : null}
      {overlay === 'underlying' ? <WidgetUnderlying widget={widget} data={state.data} onClose={close} /> : null}
      {overlay === 'settings' && def && onSaveSettings ? (
        <WidgetSettingsDialog widget={widget} def={def} dashboardName={dashboardName} onSave={onSaveSettings} onClose={close} />
      ) : null}
    </>
  );
}
