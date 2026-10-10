// Pure state transforms behind useDashboardEditor: dirty-check signature,
// appending new widgets and section headers, header text edits, and
// min-width-aware layout/width changes.

import type { Layout } from 'react-grid-layout/legacy';

import {
  DASHBOARD_GRID_COLUMNS,
  HALF_WIDTH,
  isBuiltinWidget,
  isTextWidget,
  newBuiltinWidget,
  newTextWidget,
  newWidget,
  QUARTER_WIDTH,
  textDescription,
  textWidgetHeight,
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
      if (isTextWidget(w)) {
        return { id: w.id, kind: 'text', description: textDescription(w), title: w.title ?? null, layout: w.layout };
      }
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
      category: def.category,
      subtitle: def.subtitle ?? null,
      view: def.view ?? null,
    },
  };
}

/** A new, untitled section header, placed below the current set, in response shape. */
export function textWidgetResponse(widgets: WidgetResponse[]): WidgetResponse {
  const widget = newTextWidget('', '', { y: bottomRow(widgets) });
  return {
    id: widget.id,
    kind: 'text',
    reportId: null,
    builtinKey: null,
    params: null,
    title: '',
    layout: widget.layout,
  };
}

/**
 * Edit a section header's title and/or description. The height follows the
 * description (one more row while it has text); the description is kept as
 * typed and trimmed on save.
 */
export function updateTextWidget(
  prev: WidgetResponse[],
  id: string,
  change: { title?: string; description?: string }
): WidgetResponse[] {
  return prev.map((w) => {
    if (w.id !== id || !isTextWidget(w)) return w;
    const description = change.description ?? textDescription(w);
    return {
      ...w,
      title: change.title ?? w.title ?? '',
      params: description ? { description } : null,
      layout: { ...w.layout, h: textWidgetHeight(description) },
    };
  });
}

/** Apply a grid layout change, never letting a widget shrink below its minimum width. */
export function applyLayout(prev: WidgetResponse[], layout: Layout): WidgetResponse[] {
  let changed = false;
  const next = prev.map((w) => {
    const item = layout.find((l) => l.i === w.id);
    if (!item) return w;
    const width = Math.min(DASHBOARD_GRID_COLUMNS, Math.max(item.w, widgetMinW(w)));
    const x = Math.min(item.x, DASHBOARD_GRID_COLUMNS - width);
    // A header's height is fixed by its text, never by the grid.
    const h = isTextWidget(w) ? w.layout.h : item.h;
    if (x === w.layout.x && item.y === w.layout.y && width === w.layout.w && h === w.layout.h) {
      return w;
    }
    changed = true;
    return { ...w, layout: { x, y: item.y, w: width, h } };
  });
  return changed ? next : prev;
}

/**
 * The widths the toggle cycles through, narrowest first: ¼ → ½ → full for a
 * built-in whose minimum allows a quarter, ½ (or its minimum, if wider) → full
 * otherwise (saved reports included: their grid floor is not a quarter stop),
 * and none for a widget whose minimum is the whole grid.
 */
export function widthStops(widget: WidgetResponse): number[] {
  const minW = widgetMinW(widget);
  if (minW >= DASHBOARD_GRID_COLUMNS) return [];
  if (isBuiltinWidget(widget) && minW <= QUARTER_WIDTH) return [QUARTER_WIDTH, HALF_WIDTH, DASHBOARD_GRID_COLUMNS];
  return [Math.max(HALF_WIDTH, minW), DASHBOARD_GRID_COLUMNS];
}

/** Whether a widget's width can be toggled (its minimum leaves room). */
export function canToggleWidth(widget: WidgetResponse): boolean {
  return widthStops(widget).length > 0;
}

/** The width the toggle moves a widget to: the next wider stop, wrapping from full back to the narrowest. */
export function nextWidth(widget: WidgetResponse): number | null {
  const stops = widthStops(widget);
  if (stops.length === 0) return null;
  return stops.find((w) => w > widget.layout.w) ?? stops[0];
}

const WIDTH_NAMES: Record<number, string> = {
  [QUARTER_WIDTH]: 'quarter',
  [HALF_WIDTH]: 'half',
  [DASHBOARD_GRID_COLUMNS]: 'full',
};

/** The width toggle's label: "Expand to half width", "Collapse to quarter width", … */
export function widthToggleLabel(widget: WidgetResponse): string {
  const next = nextWidth(widget);
  if (next == null) return 'This widget needs the full width';
  const name = WIDTH_NAMES[next] ?? 'minimum';
  return `${next > widget.layout.w ? 'Expand' : 'Collapse'} to ${name} width`;
}

/** Move one widget to its next width stop (see `nextWidth`), keeping it inside the grid. */
export function toggleWidth(prev: WidgetResponse[], id: string): WidgetResponse[] {
  return prev.map((w) => {
    if (w.id !== id) return w;
    const width = nextWidth(w);
    if (width == null) return w;
    return {
      ...w,
      layout: { ...w.layout, w: width, x: Math.min(w.layout.x, DASHBOARD_GRID_COLUMNS - width) },
    };
  });
}
