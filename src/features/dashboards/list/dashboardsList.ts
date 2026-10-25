import { dayMonth } from '@/features/jobs/format';
import { isTextWidget } from '@/lib/dashboards.helpers';
import type { DashboardResponse } from '@/lib/dashboards.types';

/** The name of the seeded dashboard "Restore default Home" brings back. */
export const HOME_DASHBOARD_NAME = 'Home';

/** How many widgets a dashboard has: section headers are not widgets. */
export function widgetCount(dashboard: Pick<DashboardResponse, 'widgets'>): number {
  return dashboard.widgets.filter((w) => !isTextWidget(w)).length;
}

/** "Your money at a glance · 12 widgets · Updated 13 Oct"; a dashboard without a description says so. */
export function dashboardSubtitle(dashboard: Pick<DashboardResponse, 'description' | 'widgets' | 'updatedAt'>): string {
  const n = widgetCount(dashboard);
  const description = dashboard.description?.trim() || 'No description';
  return `${description} · ${n} ${n === 1 ? 'widget' : 'widgets'} · Updated ${dayMonth(dashboard.updatedAt)}`;
}

/** Restore mints a fresh Home, so the action is offered only while there is none. */
export function canRestoreHome(dashboards: readonly Pick<DashboardResponse, 'name'>[]): boolean {
  return !dashboards.some((d) => d.name === HOME_DASHBOARD_NAME);
}

/** "18 available · add to any board". */
export function builtinsSubtitle(count: number): string {
  return `${count} available · add to any board`;
}
