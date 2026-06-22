// Small, pure helpers for the Dashboards module: minting widgets, narrowing
// availability, and validating grid placement before save.

import type {
  DashboardWidget,
  WidgetLayout,
  WidgetResponse,
} from '@/lib/dashboards.types';

/** The dashboard grid is always 100 columns wide. */
export const DASHBOARD_GRID_COLUMNS = 100;

// Half the grid — a new widget defaults to half width.
export const HALF_WIDTH = Math.round(DASHBOARD_GRID_COLUMNS / 2);
// Rows are 12px tall (see DashboardGrid); 24 rows ≈ 290px — tall enough for a
// chart or a few table rows to render without cramping.
const DEFAULT_WIDGET_HEIGHT = 24;

/**
 * Mint a new widget for a saved report: a fresh client-generated `id` (the grid
 * key) plus a default layout. Pass `layout` to override any of `{x,y,w,h}`.
 */
export function newWidget(
  reportId: string,
  layout?: Partial<WidgetLayout>
): DashboardWidget {
  return {
    id: crypto.randomUUID(),
    reportId,
    title: null,
    layout: {
      x: 0,
      y: 0,
      w: HALF_WIDTH,
      h: DEFAULT_WIDGET_HEIGHT,
      ...layout,
    },
  };
}

/**
 * Whether a widget's referenced report still resolves. Render the report only
 * when this is true; otherwise show a "report no longer available" placeholder.
 */
export function isWidgetAvailable(widget: WidgetResponse): boolean {
  return widget.report.available;
}

/** Whether a layout fits the grid: x 0..C-1, w 1..C, x+w ≤ C (C = column count), y/h ≥ 0/1. */
export function isLayoutWithinGrid(layout: WidgetLayout): boolean {
  const { x, y, w, h } = layout;
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    Number.isInteger(w) &&
    Number.isInteger(h) &&
    x >= 0 &&
    x <= DASHBOARD_GRID_COLUMNS - 1 &&
    w >= 1 &&
    w <= DASHBOARD_GRID_COLUMNS &&
    x + w <= DASHBOARD_GRID_COLUMNS &&
    y >= 0 &&
    h >= 1
  );
}

/**
 * Reasons a widget set can't be saved: out-of-bounds layouts or duplicate ids.
 * The server enforces the same rules and returns 400; check client-side first.
 */
export function validateWidgets(widgets: DashboardWidget[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  widgets.forEach((widget, i) => {
    if (seen.has(widget.id)) {
      errors.push(`Duplicate widget id: ${widget.id}`);
    }
    seen.add(widget.id);
    if (!isLayoutWithinGrid(widget.layout)) {
      errors.push(`Widget ${i + 1} is outside the 12-column grid.`);
    }
  });
  return errors;
}
