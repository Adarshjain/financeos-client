'use server';

import { reportsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type {
  CreateReportRequest,
  ReportRunOptions,
  RunReportRequest,
  UpdateReportRequest,
} from '@/lib/reports.types';

const REPORT_PATHS = ['/reports'];

export const createReport = createDomainAction(
  { fallbackError: 'Failed to create report', revalidatePaths: REPORT_PATHS },
  (reportRequest: CreateReportRequest) => reportsApi.create(reportRequest)
);

export const updateReport = createDomainAction(
  { fallbackError: 'Failed to update report', revalidatePaths: REPORT_PATHS },
  (reportId: string, reportRequest: UpdateReportRequest) => reportsApi.update(reportId, reportRequest)
);

export const deleteReport = createDomainAction(
  { fallbackError: 'Failed to delete report', revalidatePaths: REPORT_PATHS },
  (reportId: string) => reportsApi.delete(reportId)
);

export const runAdHocReport = createDomainAction(
  { fallbackError: 'Failed to run ad-hoc report' },
  (request: RunReportRequest, options?: ReportRunOptions) => reportsApi.runAdHoc(request, options)
);

