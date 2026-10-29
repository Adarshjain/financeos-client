'use server';

// The dashboards feature's reads and writes the client triggers. The browser reaches the API only through these.

import type { saveBody } from '@/features/dashboards/editor/editorState';
import { serverApi } from '@/lib/api/server';
import { AppError } from '@/lib/appError';
import { reportWidgetResponse, toDashboardWidget } from '@/lib/dashboards.helpers';
import type { DashboardResponse, WidgetParams, WidgetResponse } from '@/lib/dashboards.types';
import { createDomainAction } from '@/lib/domainApi';
import type { ReportCatalog, ReportData, ReportResponse, ReportSummaryResponse } from '@/lib/reports.types';

type SaveBody = ReturnType<typeof saveBody>;
/** A dashboard as shown: what a save outside edit mode PUTs back, with its widgets changed. */
type ShownDashboard = Pick<DashboardResponse, 'id' | 'name' | 'description' | 'isDefault' | 'widgets'>;

/** The datasource catalog (field labels and formats). */
export const loadReportCatalog = createDomainAction(
  { fallbackError: "Couldn't load the report fields. Try again." },
  async (): Promise<ReportCatalog> => {
    const { data } = await serverApi.GET('/api/v1/report/datasource');
    return data as unknown as ReportCatalog;
  },
);

/** A report widget's saved report, or null when it is gone. */
export const loadSavedReport = createDomainAction(
  { fallbackError: "Couldn't load the report. Try again." },
  async (id: string): Promise<ReportResponse | null> => {
    const { data } = await serverApi.GET('/api/v1/reports/{id}', { params: { path: { id } } });
    return (data ?? null) as unknown as ReportResponse | null;
  },
);

/** Table paging for a widget run (`sort=key,dir`); undefined for a chart or KPI. */
export interface WidgetPage {
  page: number;
  size: number;
  sort?: string;
}

/** The data behind a built-in template widget, run with its params. */
export const loadBuiltinWidgetData = createDomainAction(
  { fallbackError: "Couldn't load the widget. Try again." },
  async (key: string, params: Record<string, unknown>, page?: WidgetPage): Promise<ReportData> => {
    const { data } = await serverApi.POST('/api/v1/dashboards/builtins/{key}/data', {
      params: { path: { key }, query: page ?? {} },
      // Only declared params: the server rejects anything else.
      body: { params },
    });
    return data as unknown as ReportData;
  },
);

/** The data behind a report widget: its saved report, run. */
export const loadReportWidgetData = createDomainAction(
  { fallbackError: "Couldn't run the report. Try again." },
  async (reportId: string, page?: WidgetPage): Promise<ReportData> => {
    const { data } = await serverApi.POST('/api/v1/reports/{id}/data', {
      params: { path: { id: reportId }, query: page ?? {} },
    });
    return data as unknown as ReportData;
  },
);

/** Creates the dashboard (no `id`) or updates it. */
export const saveDashboard = createDomainAction(
  { fallbackError: "Couldn't save the dashboard. Try again." },
  async (id: string | undefined, body: SaveBody): Promise<DashboardResponse> => {
    const res = id
      ? await serverApi.PUT('/api/v1/dashboards/{id}', { params: { path: { id } }, body })
      : await serverApi.POST('/api/v1/dashboards', { body });
    return res.data as DashboardResponse;
  },
);

export const deleteDashboard = createDomainAction(
  { fallbackError: "Couldn't delete the dashboard. Try again." },
  async (id: string): Promise<null> => {
    await serverApi.DELETE('/api/v1/dashboards/{id}', { params: { path: { id } } });
    return null;
  },
);

async function putWidgetsOf(dashboard: ShownDashboard, widgets: WidgetResponse[]): Promise<DashboardResponse> {
  const { data } = await serverApi.PUT('/api/v1/dashboards/{id}', {
    params: { path: { id: dashboard.id } },
    body: {
      name: dashboard.name,
      description: dashboard.description?.trim() || undefined,
      isDefault: dashboard.isDefault,
      widgets: widgets.map(toDashboardWidget),
    },
  });
  return data as DashboardResponse;
}

/** PUTs the dashboard as shown with `widgets` in place of its own. */
export const saveDashboardWidgets = createDomainAction(
  { fallbackError: "Couldn't save the dashboard. Try again." },
  (dashboard: ShownDashboard, widgets: WidgetResponse[]) => putWidgetsOf(dashboard, widgets),
);

/** Sets or clears the default; refuses rather than overwrite a dashboard that changed since the caller loaded it. */
export const setDashboardDefault = createDomainAction(
  { fallbackError: "Couldn't change the default dashboard. Try again." },
  async (args: { id: string; makeDefault: boolean; updatedAt: string }): Promise<DashboardResponse | null> => {
    const { data: current } = await serverApi.GET('/api/v1/dashboards/{id}', { params: { path: { id: args.id } } });
    if (!current) throw new AppError('Dashboard not found', 'NOT_FOUND');
    if (current.updatedAt !== args.updatedAt) {
      throw new AppError(
        'This dashboard changed since the page was loaded. Reload and try again — setting the default would otherwise discard those changes.',
        'CONFLICT',
      );
    }
    const { data } = await serverApi.PUT('/api/v1/dashboards/{id}', {
      params: { path: { id: args.id } },
      body: {
        name: current.name,
        description: current.description ?? undefined,
        isDefault: args.makeDefault,
        widgets: current.widgets.map(toDashboardWidget),
      },
    });
    return (data ?? null) as DashboardResponse | null;
  },
);

/** Takes a widget off a dashboard, read fresh so a widget added or moved elsewhere is never overwritten. Null when it is already gone. */
export const removeWidgetFromDashboard = createDomainAction(
  { fallbackError: "Couldn't remove the report from the dashboard. Try again." },
  async (dashboardId: string, widgetId: string): Promise<DashboardResponse | null> => {
    const { data: current } = await serverApi.GET('/api/v1/dashboards/{id}', { params: { path: { id: dashboardId } } });
    if (!current) throw new AppError('Dashboard not found', 'NOT_FOUND');
    if (!current.widgets.some((w) => w.id === widgetId)) return null;
    return putWidgetsOf(current, current.widgets.filter((w) => w.id !== widgetId));
  },
);

/** Adds a saved report to a dashboard, read fresh first. Returns the saved dashboard and the new widget's id. */
export const addReportToDashboard = createDomainAction(
  { fallbackError: "Couldn't add the report to the dashboard. Try again." },
  async (
    dashboardId: string,
    report: Pick<ReportSummaryResponse, 'id' | 'name' | 'type'>,
  ): Promise<{ saved: DashboardResponse; widgetId: string }> => {
    const { data: current } = await serverApi.GET('/api/v1/dashboards/{id}', { params: { path: { id: dashboardId } } });
    if (!current) throw new AppError('Dashboard not found', 'NOT_FOUND');
    const widget = reportWidgetResponse(current.widgets, report);
    const saved = await putWidgetsOf(current, [...current.widgets, widget]);
    return { saved, widgetId: widget.id };
  },
);

/** "Duplicate as my report" for a built-in widget: resolves the template with the widget's params and saves it as a new report. */
export const duplicateBuiltinReport = createDomainAction(
  { fallbackError: "Couldn't copy the widget as a report. Try again." },
  async (builtinKey: string, params: WidgetParams) => {
    const { data: resolved } = await serverApi.POST('/api/v1/dashboards/builtins/{key}/definition', {
      params: { path: { key: builtinKey } },
      body: { params },
    });
    if (!resolved) throw new Error('This widget cannot be copied as a report.');
    const { data: report } = await serverApi.POST('/api/v1/reports', {
      body: {
        name: resolved.label,
        type: resolved.type,
        datasource: resolved.datasource,
        definition: resolved.definition,
      } as never,
    });
    if (!report) throw new Error("Couldn't create the report. Try again.");
    return { report, windowAsOf: resolved.windowAsOf ?? null };
  },
);
