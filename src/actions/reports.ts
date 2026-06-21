'use server';

import { revalidatePath } from 'next/cache';

import { ApiError, reportsApi } from '@/lib/apiClient';
import type {
  CreateReportRequest,
  ReportData,
  ReportResponse,
  ReportRunOptions,
  RunReportRequest,
  UpdateReportRequest,
} from '@/lib/reports.types';
import type { ApiResult, ErrorResponse } from '@/lib/types';

function handleReportError(error: unknown, defaultMessage: string): { success: false; error: ErrorResponse } {
  if (error instanceof ApiError) {
    return { success: false, error: error.response };
  }
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: defaultMessage,
      timestamp: new Date().toISOString(),
    },
  };
}

// Create and save a new report definition.
export async function createReport(
  reportRequest: CreateReportRequest,
): Promise<ApiResult<ReportResponse>> {
  try {
    const report = await reportsApi.create(reportRequest);
    revalidatePath('/reports');
    return { success: true, data: report };
  } catch (error) {
    return handleReportError(error, 'Failed to create report');
  }
}

// Update a saved report's name + definition (type/datasource are immutable).
export async function updateReport(
  reportId: string,
  reportRequest: UpdateReportRequest,
): Promise<ApiResult<ReportResponse>> {
  try {
    const report = await reportsApi.update(reportId, reportRequest);
    revalidatePath('/reports');
    revalidatePath(`/reports/${reportId}`);
    return { success: true, data: report };
  } catch (error) {
    return handleReportError(error, 'Failed to update report');
  }
}

// Delete a saved report.
export async function deleteReport(
  reportId: string,
): Promise<ApiResult<void>> {
  try {
    await reportsApi.delete(reportId);
    revalidatePath('/reports');
    return { success: true, data: undefined };
  } catch (error) {
    return handleReportError(error, 'Failed to delete report');
  }
}

// Run a saved report and return its computed data. page/size apply to TABLE
// reports only.
export async function runSavedReport(
  reportId: string,
  options: ReportRunOptions = {},
): Promise<ApiResult<ReportData>> {
  try {
    const data = await reportsApi.runSaved(reportId, options);
    return { success: true, data };
  } catch (error) {
    return handleReportError(error, 'Failed to run report');
  }
}

// Run an ad-hoc (unsaved) definition and return its computed data — use for
// live preview while building. page/size apply to TABLE reports only.
export async function runAdHocReport(
  reportRequest: RunReportRequest,
  options: ReportRunOptions = {},
): Promise<ApiResult<ReportData>> {
  try {
    const data = await reportsApi.runAdHoc(reportRequest, options);
    return { success: true, data };
  } catch (error) {
    return handleReportError(error, 'Failed to run report');
  }
}
