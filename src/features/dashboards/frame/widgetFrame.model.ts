// What the widget frame shows around a widget's content: its subtitle, where "Open" goes, and which items its ⋮
// menu has. Pure, so each kind's menu is checked without rendering.

import { isBuiltinWidget, isWidgetAvailable, widgetHref } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

import { builtinPieces } from '../builtins/registry';

export type WidgetMenuItemId = 'edit-report' | 'settings' | 'duplicate' | 'full-page' | 'underlying';

/** The subtitle a saved report widget carries. */
export const REPORT_SUBTITLE = 'Report';

export const BUILTIN_GONE = 'This widget is no longer available.';

/** A built-in's key (the ref's key when the top-level one is absent). */
export function widgetBuiltinKey(widget: Pick<WidgetResponse, 'builtinKey' | 'builtin'>): string | null {
  return widget.builtinKey ?? widget.builtin?.key ?? null;
}

/** The line under a widget's title: the built-in's param-aware subtitle, else the server's; "Report" for a saved report. */
export function widgetSubtitle(widget: WidgetResponse) {
  if (!isBuiltinWidget(widget)) return REPORT_SUBTITLE;
  return builtinPieces(widgetBuiltinKey(widget))?.subtitle?.(widget) ?? widget.builtin?.subtitle ?? null;
}

export { widgetHref };

/** Whether a built-in is a template (its data comes from the report engine, so it can be copied as a report). */
export function isTemplateWidget(widget: WidgetResponse): boolean {
  return isBuiltinWidget(widget) && widget.builtin?.kind === 'template';
}

/**
 * The ⋮ menu's items, in order. A report widget: Edit report, View full page, View underlying data (every report
 * widget). A built-in: Widget settings (when the dashboard can save them), Duplicate as my report (templates only),
 * View full page (a built-in with a page of its own).
 */
export function widgetMenuItems(widget: WidgetResponse, { canEditSettings }: { canEditSettings: boolean }): WidgetMenuItemId[] {
  if (!isWidgetAvailable(widget)) return [];
  if (!isBuiltinWidget(widget)) return widget.reportId ? ['edit-report', 'full-page', 'underlying'] : [];
  const items: WidgetMenuItemId[] = [];
  if (canEditSettings) items.push('settings');
  if (isTemplateWidget(widget)) items.push('duplicate');
  if (widgetHref(widget)) items.push('full-page');
  return items;
}
