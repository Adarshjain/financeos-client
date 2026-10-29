import { api } from '@/lib/api/client';
import { AppError } from '@/lib/appError';
import { reportWidgetResponse, toDashboardWidget } from '@/lib/dashboards.helpers';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { putWidgets } from '@/lib/query/hooks/useDashboards';
import type { ReportData, ReportDefinition, ReportResponse, ReportSummaryResponse, ReportType } from '@/lib/reports.types';

import type { ChatReportDraft } from './chat.types';

/** The writes behind a report draft. Each resolves with what it made or throws an Error whose message says what failed. */

// These write through the browser client, not the report server actions: an action that revalidates /reports makes
// Next re-render the open chat page, which would reset the card mid-save.

export async function saveDraftAsReport(draft: ChatReportDraft): Promise<ReportResponse> {
  const { data } = await api.POST('/api/v1/reports', {
    body: {
      name: draft.name!,
      description: draft.description || null,
      type: draft.type as ReportType,
      datasource: draft.datasource!,
      definition: draft.definition as ReportDefinition,
    } as never,
  });
  if (!data) throw new Error("Couldn't save the report. Try again.");
  return data as unknown as ReportResponse;
}

/** Runs the draft's definition for the card's preview (the browser client, like the writes: a server action here could hang). */
export async function runDraftPreview(draft: ChatReportDraft): Promise<ReportData> {
  const { data } = await api.POST('/api/v1/reports/data', {
    params: { query: {} },
    body: { type: draft.type as ReportType, datasource: draft.datasource!, definition: { ...(draft.definition as ReportDefinition) } } as never,
  });
  if (!data) throw new Error("Couldn't load the preview.");
  return data as unknown as ReportData;
}

export async function getReport(id: string): Promise<ReportResponse> {
  const { data } = await api.GET('/api/v1/reports/{id}', { params: { path: { id } } });
  if (!data) throw new AppError('Report not found');
  return data as ReportResponse;
}

/** The report's list entry (it carries the dashboards that use it); null when it is gone. */
export async function getReportSummary(id: string): Promise<ReportSummaryResponse | null> {
  const { data } = await api.GET('/api/v1/reports');
  return ((data ?? []) as ReportSummaryResponse[]).find((r) => r.id === id) ?? null;
}

async function putReport(id: string, body: { name: string; description: string | null; definition: ReportDefinition }): Promise<void> {
  await api.PUT('/api/v1/reports/{id}', { params: { path: { id } }, body: body as never });
}

export async function applyDraftUpdate(reportId: string, draft: ChatReportDraft): Promise<void> {
  await putReport(reportId, { name: draft.name!, description: draft.description || null, definition: draft.definition as ReportDefinition });
}

/** Puts the report's earlier version back (Undo of an update). */
export async function restoreReport(previous: ReportResponse): Promise<void> {
  await putReport(previous.id, { name: previous.name, description: previous.description ?? null, definition: previous.definition });
}

export async function removeReport(id: string): Promise<void> {
  await api.DELETE('/api/v1/reports/{id}', { params: { path: { id } } });
}

async function freshDashboard(id: string): Promise<DashboardResponse> {
  const { data } = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id } } });
  if (!data) throw new AppError('Dashboard not found');
  return data as DashboardResponse;
}

/** Adds the report as a widget below the others on the dashboard, read fresh first. */
export async function addReportWidget(dashboardId: string, report: Pick<ReportResponse, 'id' | 'name' | 'type'>): Promise<{ saved: DashboardResponse; widgetId: string }> {
  const current = await freshDashboard(dashboardId);
  const widget = reportWidgetResponse(current.widgets, report);
  const saved = await putWidgets(current, [...current.widgets, widget]);
  const before = new Set(current.widgets.map((w) => w.id));
  const added = saved.widgets.find((w) => !before.has(w.id) && w.reportId === report.id) ?? saved.widgets.find((w) => w.id === widget.id);
  return { saved, widgetId: (added ?? widget).id };
}

export async function removeWidgetFrom(dashboardId: string, widgetId: string): Promise<DashboardResponse | null> {
  const current = await freshDashboard(dashboardId);
  if (!current.widgets.some((w) => w.id === widgetId)) return null;
  return putWidgets(current, current.widgets.filter((w) => w.id !== widgetId));
}

/** Creates the default dashboard "Home" holding just this report's widget (for a user with no default). */
export async function createHomeWithReport(report: Pick<ReportResponse, 'id' | 'name' | 'type'>): Promise<{ saved: DashboardResponse; widgetId: string }> {
  const widget = reportWidgetResponse([], report);
  const { data } = await api.POST('/api/v1/dashboards', { body: { name: 'Home', isDefault: true, widgets: [toDashboardWidget(widget)] } });
  if (!data) throw new Error("Couldn't create the dashboard.");
  const saved = data as DashboardResponse;
  const added = saved.widgets.find((w) => w.reportId === report.id) ?? saved.widgets[0];
  return { saved, widgetId: (added ?? widget).id };
}

export async function removeDashboard(id: string): Promise<void> {
  await api.DELETE('/api/v1/dashboards/{id}', { params: { path: { id } } });
}
