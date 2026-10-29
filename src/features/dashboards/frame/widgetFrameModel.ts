// What the widget frame shows around a widget's content: its subtitle, where "Open" goes, and which items its ⋮
// menu has. Pure, so each kind's menu is checked without rendering.

import { builtinPieces } from '@/features/dashboards/builtins/registry';
import { isBuiltinWidget, isWidgetAvailable, widgetHref } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

export type WidgetMenuItemId = 'edit-report' | 'settings' | 'duplicate' | 'full-page' | 'underlying';

export const BUILTIN_GONE = 'This widget is no longer available.';

/** A built-in's key (the ref's key when the top-level one is absent). */
export function widgetBuiltinKey(widget: Pick<WidgetResponse, 'builtinKey' | 'builtin'>): string | null {
  return widget.builtinKey ?? widget.builtin?.key ?? null;
}

/** The line under a widget's title: the built-in's param-aware subtitle, else the server's; none for a saved report. */
export function widgetSubtitle(widget: WidgetResponse) {
  if (!isBuiltinWidget(widget)) return null;
  return builtinPieces(widgetBuiltinKey(widget))?.subtitle?.(widget) ?? widget.builtin?.subtitle ?? null;
}

export { widgetHref };

/** Whether a built-in is a template (its data comes from the report engine, so it can be copied as a report). */
export function isTemplateWidget(widget: WidgetResponse): boolean {
  return isBuiltinWidget(widget) && widget.builtin?.kind === 'template';
}

/** Template built-ins whose view is a KPI figure: the figure opens the built-in's underlying data. */
export const KPI_BUILTIN_KEYS: readonly string[] = ['net_worth'];

/** Whether a widget is a template built-in with a KPI figure (Net worth). */
export function isKpiBuiltinWidget(widget: WidgetResponse): boolean {
  const key = widgetBuiltinKey(widget);
  return isTemplateWidget(widget) && key != null && KPI_BUILTIN_KEYS.includes(key);
}

/**
 * Built-ins whose body already links to their page (an item, a row or a "View all"), so the ⋮ menu has no "View full
 * page" for them. A built-in with a page whose body has no such link keeps it.
 */
export const BODY_LINKED_BUILTIN_KEYS: readonly string[] = ['attention', 'milestone_progress', 'cap_headroom', 'portfolio_snapshot', 'lending_balances'];

/** Whether the figure, chart entries and rows of a widget open its underlying data (a saved report, or Net worth). */
export function widgetOpensUnderlying(widget: WidgetResponse): boolean {
  if (!isWidgetAvailable(widget)) return false;
  return isBuiltinWidget(widget) ? isKpiBuiltinWidget(widget) : Boolean(widget.reportId);
}

/**
 * The ⋮ menu's items, in order. A saved report: Edit report, plus View underlying data unless it is a KPI (its value
 * tap opens it). A built-in: Widget settings (when the dashboard can save them), Duplicate as my report (templates
 * only), View full page (a built-in with a page of its own that its body does not already link to). Net worth's
 * underlying data is its value tap only.
 */
export function widgetMenuItems(widget: WidgetResponse, { canEditSettings }: { canEditSettings: boolean }): WidgetMenuItemId[] {
  if (!isWidgetAvailable(widget)) return [];
  if (!isBuiltinWidget(widget)) {
    if (!widget.reportId) return [];
    return widget.report?.type === 'KPI' ? ['edit-report'] : ['edit-report', 'underlying'];
  }
  const items: WidgetMenuItemId[] = [];
  if (canEditSettings) items.push('settings');
  if (isTemplateWidget(widget)) items.push('duplicate');
  const key = widgetBuiltinKey(widget);
  if (widgetHref(widget) && !(key && BODY_LINKED_BUILTIN_KEYS.includes(key))) items.push('full-page');
  return items;
}
