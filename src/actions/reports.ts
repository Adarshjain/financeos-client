'use server';

import { revalidatePath } from 'next/cache';

import { reportsApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type {
  CreateReportRequest,
  ReportData,
  ReportResponse,
  ReportRunOptions,
  RunReportRequest,
  UpdateReportRequest,
} from '@/lib/reports.types';
import type { ApiResult } from '@/lib/types';

// Create and save a new report definition.
export async function createReport(
  reportRequest: CreateReportRequest,
): Promise<ApiResult<ReportResponse>> {
  return apiResult('Failed to create report', async () => {
    const report = await reportsApi.create(reportRequest);
    revalidatePath('/reports');
    return report;
  });
}

// Update a saved report's name + definition (type/datasource are immutable).
export async function updateReport(
  reportId: string,
  reportRequest: UpdateReportRequest,
): Promise<ApiResult<ReportResponse>> {
  return apiResult('Failed to update report', async () => {
    const report = await reportsApi.update(reportId, reportRequest);
    revalidatePath('/reports');
    revalidatePath(`/reports/${reportId}`);
    return report;
  });
}

// Delete a saved report.
export async function deleteReport(
  reportId: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete report', async () => {
    await reportsApi.delete(reportId);
    revalidatePath('/reports');
  });
}

// Run a saved report and return its computed data. page/size apply to TABLE
// reports only.
export async function runSavedReport(
  reportId: string,
  options: ReportRunOptions = {},
): Promise<ApiResult<ReportData>> {
  return apiResult('Failed to run report', () =>
    reportsApi.runSaved(reportId, options),
  );
}

// Run an ad-hoc (unsaved) definition and return its computed data — use for
// live preview while building. page/size apply to TABLE reports only.
export async function runAdHocReport(
  reportRequest: RunReportRequest,
  options: ReportRunOptions = {},
): Promise<ApiResult<ReportData>> {
  return apiResult('Failed to run report', () =>
    reportsApi.runAdHoc(reportRequest, options),
  );
}
