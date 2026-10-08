import type { components } from '@/lib/api/schema';

export type DashboardResponse = components['schemas']['DashboardResponse'];
export type CreateDashboardRequest = components['schemas']['CreateDashboardRequest'];
export type UpdateDashboardRequest = components['schemas']['UpdateDashboardRequest'];
export type WidgetResponse = components['schemas']['WidgetResponse'];
export type WidgetLayout = components['schemas']['WidgetLayout'];
export type DashboardWidget = components['schemas']['DashboardWidget'];
export type DashboardSummary = components['schemas']['DashboardSummary'];
export type BuiltinWidgetResponse = components['schemas']['BuiltinWidgetResponse'];
export type BuiltinParamResponse = components['schemas']['BuiltinParamResponse'];
export type BuiltinRefResponse = components['schemas']['BuiltinRefResponse'];

/** Widget kinds as the server resolves them (`kind` is always set on responses). */
export type WidgetKind = 'report' | 'builtin';

/** A built-in widget's params: a flat JSON object of declared names only. */
export type WidgetParams = Record<string, unknown>;

export interface WidgetReportRef {
  id: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
}
