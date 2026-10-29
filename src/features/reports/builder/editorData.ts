import { notFound } from 'next/navigation';
import { cache } from 'react';

import { REPORT_ROWS_PAGE_SIZE } from '@/features/reports/view/viewFormatModel';
import { type Loaded, loaded, signInIfSessionEnded } from '@/features/shell/loadHelpers';
import { ApiError } from '@/lib/api/client';
import { reportsApi } from '@/lib/apiClient';
import type { ReportCatalog, ReportData, ReportResponse } from '@/lib/reports.types';

export interface NewReportData {
  catalog: ReportCatalog;
}

export interface SavedReportData extends NewReportData {
  report: ReportResponse;
  /** The report's result for the first render; null when the run failed (the editor still opens, Preview retries). */
  initialResult: ReportData | null;
}

/** The datasource catalog the New report page needs. A failure is a page failure (nothing can be configured without it). */
export async function loadNewReport(): Promise<Loaded<NewReportData>> {
  const catalog = await loaded(reportsApi.getDatasource());
  return catalog.ok ? { ok: true, data: { catalog: catalog.data } } : catalog;
}

/**
 * A saved report, the datasource catalog and the report's result, fetched together on the server so the editor's
 * first render has all three (one request each, none repeated in the browser). A report that does not exist is a
 * 404; a failed catalog is a page failure; a failed run only leaves the preview empty.
 */
export const loadSavedReport = cache(async (id: string): Promise<Loaded<SavedReportData>> => {
  const [report, catalog, result] = await Promise.all([
    reportsApi.getById(id).catch(async (e: unknown) => {
      await signInIfSessionEnded(e);
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    loaded(reportsApi.getDatasource()),
    reportsApi.runSaved(id, { page: 0, size: REPORT_ROWS_PAGE_SIZE }).then(
      (data): ReportData | null => data,
      async (e: unknown) => {
        await signInIfSessionEnded(e);
        return null;
      },
    ),
  ]);
  if (!report) notFound();
  if (!catalog.ok) return catalog;
  return { ok: true, data: { catalog: catalog.data, report, initialResult: result } };
});
