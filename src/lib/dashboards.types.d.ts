// Types generated from API spec — Dashboards module
// See api-spec.yaml (tags: Dashboards) for the wire contract.
//
// A dashboard is a named canvas arranging report widgets on a 12-column grid.
// Each widget references a SAVED report by id and carries its grid placement —
// it stores no query logic. To render a dashboard, fetch it and run each
// widget's report through the reports client (`reportsApi.runSaved` /
// `runSavedReport`), then render the returned `ReportData` by its `type`.

import type { ReportType } from '@/lib/reports.types';

/** Widget placement on the 12-column dashboard grid. */
export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A widget as stored / sent (request side). `id` is client-generated and unique
 * within the dashboard — use it as the grid item key. The same report may be
 * referenced by multiple widgets (distinct ids).
 */
export interface DashboardWidget {
  id: string;
  /** uuid of a saved report. */
  reportId: string;
  /** Optional display override; null = use the report's own name. */
  title?: string | null;
  layout: WidgetLayout;
}

/**
 * Server-resolved metadata for a widget's referenced report. `available` is
 * false (and name/type null) when the report was deleted or isn't owned by the
 * user — render a placeholder and do NOT run it.
 */
export interface WidgetReportRef {
  name: string | null;
  type: ReportType | null;
  available: boolean;
}

/** A widget as returned, enriched with referenced-report metadata. */
export interface WidgetResponse {
  id: string;
  reportId: string;
  title: string | null;
  layout: WidgetLayout;
  report: WidgetReportRef;
}

export interface CreateDashboardRequest {
  name: string;
  description?: string | null;
  widgets: DashboardWidget[];
}

/** Update replaces name + description + the FULL widget set (not a delta). */
export interface UpdateDashboardRequest {
  name: string;
  description?: string | null;
  widgets: DashboardWidget[];
}

export interface DashboardResponse {
  id: string;
  name: string;
  description: string | null;
  widgets: WidgetResponse[];
  createdAt: string;
  updatedAt: string;
}

/** List-view dashboard metadata (no widgets, just a count). */
export interface DashboardSummaryResponse {
  id: string;
  name: string;
  description: string | null;
  widgetCount: number;
  createdAt: string;
  updatedAt: string;
}
