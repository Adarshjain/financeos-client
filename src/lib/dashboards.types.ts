import type { components } from '@/lib/api/schema';

export type DashboardResponse = components['schemas']['DashboardResponse'];
export type CreateDashboardRequest = components['schemas']['CreateDashboardRequest'];
export type UpdateDashboardRequest = components['schemas']['UpdateDashboardRequest'];
export type WidgetResponse = components['schemas']['WidgetResponse'];
export type WidgetLayout = components['schemas']['WidgetLayout'];
export type DashboardWidget = components['schemas']['DashboardWidget'];
export type DashboardSummary = components['schemas']['DashboardSummary'];

export interface WidgetReportRef {
  id: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
}
