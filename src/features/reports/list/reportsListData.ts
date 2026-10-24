import { type Loaded, loaded, orNull } from '@/features/shell/loadHelpers';
import { reportsApi } from '@/lib/apiClient';
import type { ReportSummaryResponse, ReportType } from '@/lib/reports.types';

export interface ReportsListData {
  reports: ReportSummaryResponse[];
  /** Datasource name to its label; empty when the catalog request failed (the name shows instead). */
  datasourceLabels: Record<string, string>;
}

/**
 * Everything the Reports list needs, answered for the type filter by the server. The list is not paged
 * (one request returns every report), so search and the Datasource filter work on it in the browser.
 */
export async function loadReportsList(type?: ReportType): Promise<Loaded<ReportsListData>> {
  const [list, catalog] = await Promise.all([loaded(reportsApi.list(type)), orNull(reportsApi.getDatasource())]);
  if (!list.ok) return list;
  const datasourceLabels: Record<string, string> = {};
  for (const ds of catalog?.datasources ?? []) datasourceLabels[ds.name] = ds.label;
  return { ok: true, data: { reports: list.data, datasourceLabels } };
}
