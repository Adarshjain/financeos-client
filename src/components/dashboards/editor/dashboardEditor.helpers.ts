// Pure state transforms behind useDashboardEditor: dirty-check signature,
// appending new widgets, and min-width-aware layout/width changes.

import type { Layout } from 'react-grid-layout/legacy';

import {
  DASHBOARD_GRID_COLUMNS,
  HALF_WIDTH,
  isBuiltinWidget,
  newBuiltinWidget,
  newWidget,
  widgetMinW,
  widgetParams,
} from '@/lib/dashboards.helpers';
import type {
  BuiltinWidgetResponse,
  WidgetParams,
  WidgetResponse,
} from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';

// Serialize the editable parts of a dashboard so unsaved changes can be detected.
export function editSignature(
  name: string,
  description: string,
  widgets: WidgetResponse[]
): string {
  return JSON.stringify({
    name,
    description,
    widgets: widgets.map((w) => {
      const builtin = isBuiltinWidget(w);
      return {
        id: w.id,
        kind: builtin ? 'builtin' : 'report',
        reportId: builtin ? null : (w.reportId ?? null),
        builtinKey: builtin ? (w.builtinKey ?? null) : null,
        params: builtin ? widgetParams(w) : null,
        title: w.title ?? null,
        layout: w.layout,
      };
    }),
  });
}

/** The first free row below every existing widget. */
function bottomRow(widgets: WidgetResponse[]): number {
  return widgets.reduce((max, w) => Math.max(max, w.layout.y + w.layout.h), 0);
}

/** A new report widget, placed below the current set, in response shape. */
export function reportWidgetResponse(
  widgets: WidgetResponse[],
  report: ReportSummaryResponse
): WidgetResponse {
  const widget = newWidget(report.id, { y: bottomRow(widgets) });
  return {
    id: widget.id,
    kind: 'report',
    reportId: widget.reportId,
    title: widget.title ?? null,
    layout: widget.layout,
    report: { name: report.name, type: report.type, available: true },
  };
}

/** A new built-in widget, placed below the current set, in response shape. */
export function builtinWidgetResponse(
  widgets: WidgetResponse[],
  def: BuiltinWidgetResponse,
  params: WidgetParams
): WidgetResponse {
  const widget = newBuiltinWidget(def, params, { y: bottomRow(widgets) });
  return {
    id: widget.id,
    kind: 'builtin',
    reportId: null,
    builtinKey: def.key,
    params: widget.params,
    title: null,
    layout: widget.layout,
    builtin: {
      key: def.key,
      label: def.label,
      minW: def.minW,
      kind: def.kind,
      templateType: def.templateType ?? null,
      href: def.href ?? null,
    },
  };
}

/** Apply a grid layout change, never letting a widget shrink below its minimum width. */
export function applyLayout(prev: WidgetResponse[], layout: Layout): WidgetResponse[] {
  let changed = false;
  const next = prev.map((w) => {
    const item = layout.find((l) => l.i === w.id);
    if (!item) return w;
    const width = Math.min(DASHBOARD_GRID_COLUMNS, Math.max(item.w, widgetMinW(w)));
    const x = Math.min(item.x, DASHBOARD_GRID_COLUMNS - width);
    if (x === w.layout.x && item.y === w.layout.y && width === w.layout.w && item.h === w.layout.h) {
      return w;
    }
    changed = true;
    return { ...w, layout: { x, y: item.y, w: width, h: item.h } };
  });
  return changed ? next : prev;
}

/** Whether a widget can be toggled between half and full width (its minimum leaves room). */
export function canToggleWidth(widget: WidgetResponse): boolean {
  return widgetMinW(widget) < DASHBOARD_GRID_COLUMNS;
}

/** Toggle one widget between half (or its minimum, if wider) and full width. */
export function toggleWidth(prev: WidgetResponse[], id: string): WidgetResponse[] {
  return prev.map((w) => {
    if (w.id !== id || !canToggleWidth(w)) return w;
    const isFull = w.layout.w >= DASHBOARD_GRID_COLUMNS;
    const half = Math.max(HALF_WIDTH, widgetMinW(w));
    return {
      ...w,
      layout: {
        ...w.layout,
        w: isFull ? half : DASHBOARD_GRID_COLUMNS,
        x: isFull ? Math.min(w.layout.x, DASHBOARD_GRID_COLUMNS - half) : 0,
      },
    };
  });
}
