// The server stores a widget's place as {x, y, w, h} on a 100-column grid; the Dinero grid is an ordered flow with
// width steps (quarter ... full). These pure functions map one to the other. Reading: order by y then x, width = the
// nearest step. Writing: the order is the array's, widths come from the steps, and x/y are re-flowed in rows of
// 100 columns with `h` kept, so Legacy (which lays out by x/y) shows the same order and widths.

import {
  WIDGET_GRID_WIDTHS,
  type WidgetGridLayoutItem,
  widgetGridSpan,
  type WidgetGridWidth,
  widgetGridWidthFromColumns,
} from '@/components/ds';
import { DASHBOARD_GRID_COLUMNS, isTextWidget, widgetMinW } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

/** Columns (of 100) a width step is written back as. */
export const WIDTH_COLUMNS: Record<WidgetGridWidth, number> = {
  quarter: 25,
  third: 33,
  half: 50,
  'two-thirds': 67,
  'three-quarters': 75,
  full: 100,
};

/** The width step's label ("Half width"). */
export const WIDTH_LABELS: Record<WidgetGridWidth, string> = {
  quarter: 'Quarter width',
  third: 'Third width',
  half: 'Half width',
  'two-thirds': 'Two-thirds width',
  'three-quarters': 'Three-quarters width',
  full: 'Full width',
};

/** The narrowest step for a minimum width in columns: `full` for the whole grid, otherwise the first step wide enough. */
export function stepForMinimum(min: number): WidgetGridWidth {
  if (min >= DASHBOARD_GRID_COLUMNS) return 'full';
  return WIDGET_GRID_WIDTHS.find((step) => WIDTH_COLUMNS[step] >= min) ?? 'full';
}

/** The narrowest step a widget may take: a header and a full-width built-in only take `full`; otherwise the first step wide enough for its minimum. */
export function minWidthStep(widget: Pick<WidgetResponse, 'kind' | 'builtin'>): WidgetGridWidth {
  return stepForMinimum(widgetMinW(widget));
}

const stepIndex = (step: WidgetGridWidth) => WIDGET_GRID_WIDTHS.indexOf(step);

/** A step, widened to the widget's minimum when it is narrower. */
export function clampStep(widget: Pick<WidgetResponse, 'kind' | 'builtin'>, step: WidgetGridWidth): WidgetGridWidth {
  if (isTextWidget(widget)) return 'full';
  const min = minWidthStep(widget);
  return stepIndex(step) < stepIndex(min) ? min : step;
}

/** A stored widget's width step: the nearest step to its columns, never narrower than its minimum. */
export function widthStepOf(widget: WidgetResponse): WidgetGridWidth {
  if (isTextWidget(widget)) return 'full';
  return clampStep(widget, widgetGridWidthFromColumns(widget.layout.w, DASHBOARD_GRID_COLUMNS));
}

/** Widgets in reading order: top to bottom by `y`, then left to right by `x`; ties keep the stored order. */
export function orderWidgets(widgets: readonly WidgetResponse[]): WidgetResponse[] {
  return widgets
    .map((widget, index) => ({ widget, index }))
    .sort((a, b) => a.widget.layout.y - b.widget.layout.y || a.widget.layout.x - b.widget.layout.x || a.index - b.index)
    .map(({ widget }) => widget);
}

/** The grid's layout (order and width of each widget) for widgets already in order. */
export function toGridLayout(widgets: readonly WidgetResponse[]): WidgetGridLayoutItem[] {
  return widgets.map((w) => ({ id: w.id, width: widthStepOf(w) }));
}

/**
 * Applies a grid layout (after a drag or a resize) to the widgets: their new order and widths (a width below a
 * widget's minimum is widened to it). Returns the same array when nothing changed, so a refused resize is not
 * an edit.
 */
export function applyGridLayout(widgets: WidgetResponse[], layout: readonly WidgetGridLayoutItem[]): WidgetResponse[] {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  const next: WidgetResponse[] = [];
  const used = new Set<string>();
  for (const item of layout) {
    const widget = byId.get(item.id);
    if (!widget || used.has(item.id)) continue;
    used.add(item.id);
    const columns = WIDTH_COLUMNS[clampStep(widget, item.width)];
    next.push(columns === widget.layout.w ? widget : { ...widget, layout: { ...widget.layout, w: columns } });
  }
  for (const widget of widgets) if (!used.has(widget.id)) next.push(widget);
  const same = next.length === widgets.length && next.every((w, i) => w === widgets[i]);
  return same ? widgets : next;
}

/**
 * Writes the flow back as {x, y, w, h}: each widget takes its step's width, rows fill left to right in the order
 * given (a widget that no longer fits starts the next row), `y` advances by the tallest `h` of a row, and `h` is
 * kept. A header is a full-width row of its own.
 */
export function flowLayout(widgets: readonly WidgetResponse[]): WidgetResponse[] {
  let y = 0;
  let cursor = 0;
  let rowHeight = 0;
  return widgets.map((widget) => {
    const step = widthStepOf(widget);
    const span = widgetGridSpan(step);
    if (cursor > 0 && cursor + span > 12) {
      y += rowHeight;
      cursor = 0;
      rowHeight = 0;
    }
    const x = cursor === 0 ? 0 : Math.round((cursor * DASHBOARD_GRID_COLUMNS) / 12);
    const h = widget.layout.h;
    cursor += span;
    rowHeight = Math.max(rowHeight, h);
    return { ...widget, layout: { x, y, w: WIDTH_COLUMNS[step], h } };
  });
}

/** The widgets as the editor starts from them: reading order, widths snapped to steps, positions flowed. */
export function normalizeWidgets(widgets: readonly WidgetResponse[]): WidgetResponse[] {
  return flowLayout(orderWidgets(widgets));
}
