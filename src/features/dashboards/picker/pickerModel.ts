// What the Add widget picker lists and says: the cards' meta lines ("Half width · needs: card"), search, and the
// width a new widget would start at.

import { WIDGET_GRID_WIDTHS, type WidgetGridWidth, widgetGridWidthFromColumns } from '@/components/ds/WidgetGrid/WidgetGrid';
import { stepForMinimum, WIDTH_LABELS } from '@/features/dashboards/layout/widgetLayoutModel';
import { DASHBOARD_GRID_COLUMNS, HALF_WIDTH, newBuiltinWidth } from '@/lib/dashboards.helpers';
import type { BuiltinParamResponse, BuiltinWidgetResponse } from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { paramLabel } from '../params/paramsModel';

/** The width step a new built-in starts at: full when its minimum is the whole grid, a quarter when it allows one, else half (or its minimum). */
export function newBuiltinStep(def: Pick<BuiltinWidgetResponse, 'minW'>): WidgetGridWidth {
  const nearest = widgetGridWidthFromColumns(newBuiltinWidth(def.minW), DASHBOARD_GRID_COLUMNS);
  // As the widget is read back: never narrower than its minimum.
  const min = stepForMinimum(def.minW);
  return WIDGET_GRID_WIDTHS.indexOf(nearest) < WIDGET_GRID_WIDTHS.indexOf(min) ? min : nearest;
}

/** A new report widget starts at half width. */
export const REPORT_STEP: WidgetGridWidth = widgetGridWidthFromColumns(HALF_WIDTH, DASHBOARD_GRID_COLUMNS);

/** One param's words: "needs: card" for a required one, "n = 5" for an optional one with a default; null for the rest. */
function paramMeta(param: BuiltinParamResponse): string | null {
  if (param.required) return `needs: ${paramLabel(param).toLowerCase()}`;
  const value = param.defaultValue;
  return typeof value === 'number' || typeof value === 'string' ? `${param.name} = ${value}` : null;
}

/** A built-in card's meta line: its width (or "Selected" once chosen), then what it needs or defaults to. */
export function builtinMeta(def: BuiltinWidgetResponse, selected: boolean): string {
  const lead = selected ? 'Selected' : WIDTH_LABELS[newBuiltinStep(def)];
  return [lead, ...def.params.map(paramMeta).filter((m): m is string => m !== null)].join(' · ');
}

/** A report card's meta line. */
export function reportMeta(selected: boolean): string {
  return selected ? 'Selected' : WIDTH_LABELS[REPORT_STEP];
}

const REPORT_TYPE_LABELS: Record<string, string> = { KPI: 'KPI report', CHART: 'Chart report', TABLE: 'Table report' };

/** A report card's description: its own, else its kind. */
export function reportDescription(report: Pick<ReportSummaryResponse, 'description' | 'type'>): string {
  return report.description?.trim() || REPORT_TYPE_LABELS[report.type] || 'Saved report';
}

/** Case-insensitive match of every word of the query against any of the texts. */
export function matchesQuery(query: string, ...texts: Array<string | null | undefined>): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = texts.filter(Boolean).join(' ').toLowerCase();
  return words.every((w) => haystack.includes(w));
}

/** The built-ins shown for a category ('all' = every one; 'reports' = none) and query. The one search: the Legacy picker uses it too. */
export function filterBuiltins(builtins: readonly BuiltinWidgetResponse[], category: string, query: string): BuiltinWidgetResponse[] {
  if (category === 'reports') return [];
  return builtins.filter((b) => (category === 'all' || b.category === category) && matchesQuery(query, b.label, b.description));
}

/** The saved reports shown for a category (only under 'all' and 'reports') and query. */
export function filterReports(reports: readonly ReportSummaryResponse[], category: string, query: string): ReportSummaryResponse[] {
  if (category !== 'all' && category !== 'reports') return [];
  return reports.filter((r) => matchesQuery(query, r.name, r.type));
}
