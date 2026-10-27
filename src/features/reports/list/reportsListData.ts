import { type Loaded, loaded, orNull } from '@/features/shell/loadHelpers';
import { reportsApi } from '@/lib/apiClient';
import type { ReportSummaryResponse } from '@/lib/reports.types';

export interface ReportsListData {
  reports: ReportSummaryResponse[];
  /** Datasource name to its label; empty when the catalog request failed (the name shows instead). */
  datasourceLabels: Record<string, string>;
}

/**
 * Everything the Reports list needs. The list is not paged (one request returns every report), so the type
 * chips and the search work on it in the browser.
 */
export async function loadReportsList(): Promise<Loaded<ReportsListData>> {
  const [list, catalog] = await Promise.all([
    loaded(reportsApi.list()),
    orNull(reportsApi.getDatasource()),
  ]);
  if (!list.ok) return list;
  const datasourceLabels: Record<string, string> = {};
  for (const ds of catalog?.datasources ?? []) datasourceLabels[ds.name] = ds.label;
  return { ok: true, data: { reports: list.data, datasourceLabels } };
}
