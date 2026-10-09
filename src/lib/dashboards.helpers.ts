// Small, pure helpers for the Dashboards module: minting widgets, narrowing
// availability, and validating grid placement before save.

import type {
  BuiltinWidgetResponse,
  DashboardWidget,
  WidgetLayout,
  WidgetParams,
  WidgetResponse,
} from '@/lib/dashboards.types';
import type { SortClause } from '@/lib/reports.types';

/** The dashboard grid is always 100 columns wide. */
export const DASHBOARD_GRID_COLUMNS = 100;

// Half the grid — a new widget defaults to half width.
export const HALF_WIDTH = Math.round(DASHBOARD_GRID_COLUMNS / 2);
// Rows are 12px tall (see DashboardGrid); 24 rows ≈ 290px — tall enough for a
// chart or a few table rows to render without cramping.
const DEFAULT_WIDGET_HEIGHT = 24;
// The bills list carries per-bill actions, so it gets a little more room.
const BILLS_DUE_WIDGET_HEIGHT = 28;
/** The grid's own floor for any widget's width. */
const GRID_MIN_WIDTH = 2;

export const BUILTIN_BILLS_DUE = 'bills_due';
/** The Inbox built-in: a component widget rendering the most urgent inbox rows. */
export const BUILTIN_ATTENTION = 'attention';
export const BUILTIN_UPCOMING = 'upcoming';
export const BUILTIN_NET_WORTH = 'net_worth';

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
    kind: 'report',
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
 * Mint a new built-in widget. Width is full for a built-in whose minimum is the
 * whole grid, half otherwise; `layout` overrides any of `{x,y,w,h}`.
 */
export function newBuiltinWidget(
  def: BuiltinWidgetResponse,
  params: WidgetParams,
  layout?: Partial<WidgetLayout>
): DashboardWidget {
  return {
    id: crypto.randomUUID(),
    kind: 'builtin',
    builtinKey: def.key,
    params: stableParams(params),
    title: null,
    layout: {
      x: 0,
      y: 0,
      w: def.minW >= DASHBOARD_GRID_COLUMNS ? DASHBOARD_GRID_COLUMNS : HALF_WIDTH,
      h: def.key === BUILTIN_BILLS_DUE ? BILLS_DUE_WIDGET_HEIGHT : DEFAULT_WIDGET_HEIGHT,
      ...layout,
    },
  };
}

/** Whether a widget references a built-in (vs a saved report). */
export function isBuiltinWidget(widget: Pick<WidgetResponse, 'kind'>): boolean {
  return widget.kind === 'builtin';
}

/**
 * Whether a widget still resolves: a built-in whose key the server knows
 * (`builtin` non-null), or a report widget whose report is still available.
 * Render the widget only when this is true; otherwise show a placeholder.
 */
export function isWidgetAvailable(widget: WidgetResponse): boolean {
  if (isBuiltinWidget(widget)) return widget.builtin != null;
  return Boolean(widget.reportId) && widget.report?.available === true;
}

/** Display title: the override, else the built-in label, else the report name. */
export function widgetTitle(widget: WidgetResponse): string {
  return (
    widget.title?.trim() ||
    widget.builtin?.label ||
    widget.report?.name ||
    'Untitled'
  );
}

/** The narrowest this widget may be laid out (a built-in's own minimum, else the grid floor). */
export function widgetMinW(widget: { builtin?: { minW: number } | null }): number {
  return widget.builtin?.minW ?? GRID_MIN_WIDTH;
}

/** A copy of `params` with keys sorted and null/undefined values dropped (absent == null server-side). */
export function stableParams(params: unknown): WidgetParams {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  const source = params as Record<string, unknown>;
  const out: WidgetParams = {};
  for (const key of Object.keys(source).sort()) {
    const value = source[key];
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

/** A widget's params, normalized (see `stableParams`). */
export function widgetParams(widget: Pick<WidgetResponse, 'params'>): WidgetParams {
  return stableParams(widget.params);
}

/** A runtime header sort as the run endpoints' `sort` query param: `key,dir`. */
export function sortQueryValue(sort: SortClause): string {
  return `${sort.key},${sort.direction}`;
}

/**
 * The paging half of a widget's query params (TABLE only): page and size, plus
 * the runtime sort ONLY when one is set — so an unsorted key stays identical
 * to the server prefetch's, which never sorts.
 */
function tableQueryParams(
  isTable: boolean,
  page: number,
  size: number,
  sort: SortClause | null,
): Record<string, unknown> {
  if (!isTable) return {};
  return { page, size, ...(sort ? { sort: sortQueryValue(sort) } : {}) };
}

/**
 * The `params` half of `keys.dashboards.widget(widget.id, params)` — everything
 * a widget's report-run query depends on besides its own id: which report it
 * runs, and (for TABLE reports only) the page being viewed and its runtime sort.
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
  sort: SortClause | null = null,
): Record<string, unknown> {
  return {
    reportId,
    isTable,
    ...tableQueryParams(isTable, page, size, sort),
  };
}

/**
 * `widgetQueryParams` for a built-in template widget: its key and its params
 * (pass them through `stableParams` so key order never differs between the
 * server prefetch and the client hook).
 */
export function builtinWidgetQueryParams(
  builtinKey: string,
  params: WidgetParams,
  isTable: boolean,
  page: number,
  size: number,
  sort: SortClause | null = null,
): Record<string, unknown> {
  return {
    builtinKey,
    params: stableParams(params),
    isTable,
    ...tableQueryParams(isTable, page, size, sort),
  };
}

/** The save-request shape of a widget (`DashboardWidget`), from its response shape. */
export function toDashboardWidget(widget: WidgetResponse): DashboardWidget {
  const builtin = isBuiltinWidget(widget);
  return {
    id: widget.id,
    kind: builtin ? 'builtin' : 'report',
    reportId: builtin ? null : (widget.reportId ?? null),
    builtinKey: builtin ? (widget.builtinKey ?? null) : null,
    params: builtin ? widgetParams(widget) : null,
    title: widget.title?.trim() || null,
    layout: widget.layout,
  };
}

/**
 * A built-in template's definition with the widget's params applied, for
 * "Duplicate as my report": `upcoming`'s next-x-days horizon takes `days`.
 */
export function builtinDefinitionWithParams(
  def: BuiltinWidgetResponse,
  params: WidgetParams,
): unknown {
  const definition: unknown = def.templateDefinition == null
    ? {}
    : JSON.parse(JSON.stringify(def.templateDefinition));
  const days = params.days;
  if (def.key !== BUILTIN_UPCOMING || typeof days !== 'number') return definition;
  const filters = (definition as { filters?: unknown }).filters;
  if (!Array.isArray(filters)) return definition;
  for (const filter of filters as Array<Record<string, unknown>>) {
    if (filter?.field === 'dueDate' && filter.operator === 'next_x_days') {
      filter.value = { amount: days };
    }
  }
  return definition;
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

/** A widget as validated: the request shape, optionally carrying its resolved built-in ref. */
type ValidatableWidget = DashboardWidget & { builtin?: { minW: number; label?: string } | null };

/**
 * Reasons a widget set can't be saved: out-of-bounds layouts, duplicate ids,
 * a built-in narrower than its minimum, or a built-in the server no longer
 * knows. The server enforces the same rules and returns 400; check client-side first.
 */
export function validateWidgets(widgets: ValidatableWidget[]): string[] {
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
    if (widget.kind === 'builtin' && 'builtin' in widget && widget.builtin == null) {
      errors.push(`Widget ${i + 1} is no longer available — remove it to save.`);
    }
    const minW = widgetMinW(widget);
    if (widget.kind === 'builtin' && widget.layout.w < minW) {
      const label = widget.builtin?.label ?? `Widget ${i + 1}`;
      errors.push(`${label} must be at least ${minW} of ${DASHBOARD_GRID_COLUMNS} columns wide.`);
    }
  });
  return errors;
}
