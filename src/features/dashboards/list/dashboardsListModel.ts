import { dashboardHref } from '@/features/dashboards/routes';
import { isTextWidget } from '@/lib/dashboards.helpers';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { todayInAppZone } from '@/lib/date-range';
import { formatCount, formatDate } from '@/lib/format';

/** The name of the seeded dashboard "Restore default Home" brings back. */
export const HOME_DASHBOARD_NAME = 'Home';

/** How many widgets a dashboard has: section headers are not widgets. */
export function widgetCount(dashboard: Pick<DashboardResponse, 'widgets'>): number {
  return dashboard.widgets.filter((w) => !isTextWidget(w)).length;
}

/** Restore mints a fresh Home, so the action is offered only while there is none. */
export function canRestoreHome(dashboards: readonly Pick<DashboardResponse, 'name'>[]): boolean {
  return !dashboards.some((d) => d.name === HOME_DASHBOARD_NAME);
}

export interface DashboardRow {
  id: string;
  name: string;
  description: string | null;
  widgets: number;
  /** "3 widgets". */
  widgetsLabel: string;
  isDefault: boolean;
  updatedAt: string;
  /** "today", "yesterday" or "25 Oct". */
  updated: string;
  /** The second line of a phone row: Default when it is, widgets, then when it was updated. */
  phoneSub: string;
  href: string;
}

export function dashboardRow(d: DashboardResponse): DashboardRow {
  const widgets = widgetCount(d);
  const widgetsLabel = formatCount(widgets, ['widget', 'widgets']);
  const updated = formatDate(todayInAppZone(new Date(d.updatedAt)), 'relative', { today: todayInAppZone(), inline: true });
  return {
    id: d.id,
    name: d.name,
    description: d.description?.trim() || null,
    widgets,
    widgetsLabel,
    isDefault: d.isDefault,
    updatedAt: d.updatedAt,
    updated,
    phoneSub: [d.isDefault ? 'Default' : null, widgetsLabel, `updated ${updated}`].filter(Boolean).join(' · '),
    href: dashboardHref(d.id),
  };
}

/** Rows in the order the server sent them. */
export function dashboardRows(dashboards: readonly DashboardResponse[]): DashboardRow[] {
  return dashboards.map(dashboardRow);
}

/** Rows matching the search (every word, against name and description). */
export function filterDashboardRows(rows: DashboardRow[], search: string): DashboardRow[] {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return rows;
  return rows.filter((r) => {
    const haystack = `${r.name} ${r.description ?? ''}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
