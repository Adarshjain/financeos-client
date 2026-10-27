import { formatDayMonthRelative } from '@/features/accounts/list/accountsList';
import { chartTypeLabel } from '@/features/reports/chartTypeLabels';
import { appHref } from '@/features/shell/routes';
import { todayInAppZone } from '@/lib/date-range';
import type { ReportDashboardRef, ReportSummaryResponse, ReportType } from '@/lib/reports.types';

/** The Reports list URL. */
export const REPORTS_HREF = appHref('/reports');

/** The Dashboards tab. */
export const DASHBOARDS_HREF = appHref('/dashboards');

/** The example question on the Ask instead card. */
export const ASK_EXAMPLE = 'dining spend per month on Regalia, this year';

/** Opens a new chat that sends the example question at once. */
export const ASK_HREF = appHref(`/chat?q=${encodeURIComponent(ASK_EXAMPLE)}`);

/** A report's editor: opening a report from the list opens it. */
export const reportHref = (id: string): string => appHref(`/reports/${id}`);

/** The New report page. */
export const NEW_REPORT_HREF = appHref('/reports/new');

// ---- URL state -------------------------------------------------------------

/** What the type chips filter by: the report types, with Breakdown (a chart subtype) split out of Chart. */
export type ReportKind = 'KPI' | 'CHART' | 'BREAKDOWN' | 'TABLE';

export const REPORT_KINDS: ReportKind[] = ['KPI', 'CHART', 'BREAKDOWN', 'TABLE'];

/** The type chips after All, in board order. */
export const TYPE_CHIPS: { type: ReportKind; label: string }[] = [
  { type: 'KPI', label: 'KPI' },
  { type: 'CHART', label: 'Chart' },
  { type: 'BREAKDOWN', label: 'Breakdown' },
  { type: 'TABLE', label: 'Table' },
];

/** The type filter in the URL (`?type=`); anything else is All. */
export function parseReportsType(params: { type?: string }): ReportKind | undefined {
  return REPORT_KINDS.find((t) => t === params.type);
}

/** The Reports list URL for a type filter; All has no query string. */
export function reportsUrl(type?: ReportKind): string {
  return type ? `${REPORTS_HREF}?type=${type}` : REPORTS_HREF;
}

// ---- Areas -----------------------------------------------------------------

/**
 * The area each datasource belongs to, for the list's group bands. The server's datasource catalog
 * carries no area, so the grouping lives here (see PROGRESS open question).
 */
const AREAS: { id: string; label: string; datasources: string[] }[] = [
  { id: 'spending', label: 'Spending', datasources: ['transactions', 'attention', 'obligations'] },
  {
    id: 'wealth',
    label: 'Wealth',
    datasources: ['net_worth', 'portfolio_value', 'positions', 'realized_lots', 'investment_trades', 'fno_trades', 'dividends'],
  },
  {
    id: 'cards-loans',
    label: 'Cards & loans',
    datasources: ['reward_earnings', 'reward_caps', 'reward_milestones', 'loan_payments', 'loan_tax_summary', 'lendings'],
  },
];

const OTHER_AREA = { id: 'other', label: 'Other' };

/** The area a datasource belongs to; a datasource no area lists goes under Other. */
export function areaOf(datasource: string): { id: string; label: string } {
  return AREAS.find((a) => a.datasources.includes(datasource)) ?? OTHER_AREA;
}

const areaOrder = (id: string): number => {
  const i = AREAS.findIndex((a) => a.id === id);
  return i === -1 ? AREAS.length : i;
};

// ---- Rows ------------------------------------------------------------------

export interface ReportRow {
  id: string;
  name: string;
  description: string | null;
  type: ReportType;
  /** The type chip this report counts under. */
  kind: ReportKind;
  typeLabel: string;
  datasource: string;
  datasourceLabel: string;
  areaId: string;
  areaLabel: string;
  dashboards: ReportDashboardRef[];
  /** "On dashboards" cell: the names, or "None". */
  onDashboards: string;
  /** "today", "yesterday" or "25 Oct". */
  updated: string;
  /** The second line of a phone row: type, datasource, where it is used, updated. */
  phoneSub: string;
  href: string;
}

const TYPE_LABELS: Record<ReportType, string> = { KPI: 'KPI', CHART: 'Chart', TABLE: 'Table' };

/** "on Home" for one dashboard, "on 2 dashboards" for more, nothing for none. */
function usedOn(dashboards: ReportDashboardRef[]): string | null {
  if (dashboards.length === 0) return null;
  return dashboards.length === 1 ? `on ${dashboards[0].name}` : `on ${dashboards.length} dashboards`;
}

export function reportRow(report: ReportSummaryResponse, datasourceLabels: Record<string, string>): ReportRow {
  const area = areaOf(report.datasource);
  const datasourceLabel = datasourceLabels[report.datasource] ?? report.datasource;
  const dashboards = report.dashboards ?? [];
  const used = usedOn(dashboards);
  const typeLabel = report.chartType ? chartTypeLabel(report.chartType) : TYPE_LABELS[report.type];
  const updated = formatDayMonthRelative(todayInAppZone(new Date(report.updatedAt)), todayInAppZone());
  return {
    id: report.id,
    name: report.name,
    description: report.description?.trim() || null,
    type: report.type,
    kind: report.type === 'CHART' && report.chartType === 'breakdown' ? 'BREAKDOWN' : report.type,
    typeLabel,
    datasource: report.datasource,
    datasourceLabel,
    areaId: area.id,
    areaLabel: area.label,
    dashboards,
    onDashboards: dashboards.length > 0 ? dashboards.map((d) => d.name).join(' · ') : 'None',
    updated,
    phoneSub: [typeLabel, datasourceLabel, used, `updated ${updated}`].filter(Boolean).join(' · '),
    href: reportHref(report.id),
  };
}

/** Rows grouped by area (board order, Other last), each group by name, so the table's bands are consecutive. */
export function reportRows(reports: ReportSummaryResponse[], datasourceLabels: Record<string, string>): ReportRow[] {
  return reports
    .map((r) => reportRow(r, datasourceLabels))
    .sort((a, b) => areaOrder(a.areaId) - areaOrder(b.areaId) || a.name.localeCompare(b.name));
}

/** Rows of the chosen type (all when none) matching the search (every word, against name, description and datasource). */
export function filterRows(rows: ReportRow[], search: string, kind?: ReportKind): ReportRow[] {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (kind && r.kind !== kind) return false;
    if (words.length === 0) return true;
    const haystack = `${r.name} ${r.description ?? ''} ${r.datasourceLabel}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

// ---- Templates -------------------------------------------------------------

export interface ReportTemplate {
  id: string;
  label: string;
}

/** The fixed templates of "Start from a template" (board). */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'spend-vs-last-month-by-category', label: 'Spend vs last month by category' },
  { id: 'dividend-income-by-fy', label: 'Dividend income by FY' },
];

/** Where "Use" goes: the New report page, told which template to start from. */
export const templateHref = (t: ReportTemplate): string => `${NEW_REPORT_HREF}?template=${t.id}`;
