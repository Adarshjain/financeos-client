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

/**
 * The `params` half of `keys.dashboards.widget(widget.id, params)` — everything
 * a widget's report-run query depends on besides its own id: which report it
 * runs, and (for TABLE reports only) the page being viewed.
 *
 * Shared by `DashboardWidgetView`'s `useQuery` and the landing page's server
 * prefetch (`prefetchWidgetData`) so both sides always compute byte-identical
 * keys — the prefetch's whole point is that the client hook hydrates from it
 * with no fetch of its own. Takes scalars (rather than the whole widget)
 * so callers pass each field in by name — keeping every field this collapses
 * into visible, literally, at the `useQuery`/`prefetchQuery` call site for
 * exhaustive-deps lint checks.
 */
export function widgetQueryParams(
  reportId: string,
  isTable: boolean,
  page: number,
  size: number,
): Record<string, unknown> {
  return {
    reportId,
    isTable,
    ...(isTable ? { page, size } : {}),
  };
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
      errors.push(
        `Widget ${i + 1} is outside the ${DASHBOARD_GRID_COLUMNS}-column grid.`,
      );
    }
  });
  return errors;
}
