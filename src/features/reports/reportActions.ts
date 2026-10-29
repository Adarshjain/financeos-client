'use server';

// The reports feature's reads and writes the client triggers (a dialog opening, a Preview, a save). The browser
// reaches the API only through these; each takes and returns plain data.

import type { KpiUnderlyingResponse, RowBreakdownResponse, UnderlyingPeriod, UnderlyingSource } from '@/features/reports/underlying/underlying.types';
import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type { CreateReportRequest, ReportData, ReportResponse, RunReportRequest, UpdateReportRequest } from '@/lib/reports.types';

/** One row's breakdown (every section's first page included). */
export const loadRowBreakdown = createDomainAction(
  { fallbackError: "Couldn't load the breakdown. Try again." },
  async (datasource: string, rowId: string, size: number): Promise<RowBreakdownResponse> => {
    const { data } = await serverApi.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown', {
      params: { path: { name: datasource, rowId }, query: { size } },
    });
    return data!;
  },
);

/** A page of one breakdown section; `sort` is the `key,dir` value over the whole section. */
export const loadBreakdownSection = createDomainAction(
  { fallbackError: "Couldn't load the breakdown. Try again." },
  async (datasource: string, rowId: string, section: string, page: number, size: number, sort?: string): Promise<ReportData> => {
    const { data } = await serverApi.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}', {
      params: { path: { name: datasource, rowId, section }, query: { page, size, ...(sort && { sort }) } },
    });
    return data as unknown as ReportData;
  },
);

export interface UnderlyingQueryArgs {
  period: UnderlyingPeriod;
  page: number;
  size: number;
  /** The `key,dir` sort value, or undefined for the report's own order. */
  sort?: string;
}

/** One page of a period's underlying rows; the three source kinds map onto the saved / ad-hoc / built-in endpoints. */
export const loadUnderlying = createDomainAction(
  { fallbackError: "Couldn't load the underlying data. Try again." },
  async (source: UnderlyingSource, q: UnderlyingQueryArgs): Promise<KpiUnderlyingResponse> => {
    const query = { period: q.period, page: q.page, size: q.size, sort: q.sort };
    switch (source.kind) {
      case 'saved': {
        const { data } = await serverApi.POST('/api/v1/reports/{id}/underlying', {
          params: { path: { id: source.reportId }, query },
        });
        return data!;
      }
      case 'adhoc': {
        const { data } = await serverApi.POST('/api/v1/reports/underlying', {
          params: { query },
          body: { ...source.request, definition: { ...source.request.definition } },
        });
        return data!;
      }
      case 'builtin': {
        const { data } = await serverApi.POST('/api/v1/dashboards/builtins/{key}/underlying', {
          params: { path: { key: source.key }, query },
          body: { params: source.params },
        });
        return data!;
      }
    }
  },
);

/** The values a datasource's dynamic filter fields offer, by field. */
export const loadReportFieldValues = createDomainAction(
  { fallbackError: "Couldn't load the filter values. Try again." },
  async (datasource: string): Promise<Record<string, { value: string; label: string }[]>> => {
    const { data } = await serverApi.GET('/api/v1/report/datasource/{name}/values', {
      params: { path: { name: datasource } },
    });
    return (data?.options ?? {}) as Record<string, { value: string; label: string }[]>;
  },
);

/** Runs a report definition that is not saved (the editor's preview, a built-in's by-kind report); `query` pages a table. */
export const runAdHocReport = createDomainAction(
  { fallbackError: "Couldn't run the report. Try again." },
  async (request: RunReportRequest, query: { page?: number; size?: number; sort?: string }): Promise<ReportData> => {
    const { data } = await serverApi.POST('/api/v1/reports/data', {
      params: { query },
      body: { ...request, definition: { ...request.definition } },
    });
    return data as unknown as ReportData;
  },
);

export const createReport = createDomainAction(
  { fallbackError: "Couldn't save the report. Try again." },
  async (body: CreateReportRequest): Promise<ReportResponse> => {
    const { data } = await serverApi.POST('/api/v1/reports', {
      body: { ...body, description: body.description ?? undefined, definition: { ...body.definition } },
    });
    return data as unknown as ReportResponse;
  },
);

export const updateReport = createDomainAction(
  { fallbackError: "Couldn't save the report. Try again." },
  async (id: string, body: UpdateReportRequest): Promise<ReportResponse> => {
    const { data } = await serverApi.PUT('/api/v1/reports/{id}', {
      params: { path: { id } },
      body: { ...body, description: body.description ?? undefined, definition: { ...body.definition } },
    });
    return data as unknown as ReportResponse;
  },
);

export const deleteReport = createDomainAction(
  { fallbackError: "Couldn't delete the report. Try again." },
  async (id: string): Promise<null> => {
    await serverApi.DELETE('/api/v1/reports/{id}', { params: { path: { id } } });
    return null;
  },
);

/** Copies a report: reads it, then creates "<name> (copy)" with the same definition. Returns the copy. */
export const duplicateReportCopy = createDomainAction(
  { fallbackError: "Couldn't duplicate the report. Try again." },
  async (id: string): Promise<ReportResponse> => {
    const { data: src } = await serverApi.GET('/api/v1/reports/{id}', { params: { path: { id } } });
    if (!src) throw new Error('Report not found');
    const res = await serverApi.POST('/api/v1/reports', {
      body: {
        name: `${src.name} (copy)`,
        description: src.description,
        type: src.type,
        datasource: src.datasource,
        definition: src.definition,
      } as never,
    });
    if (res.error) throw res.error;
    return res.data as unknown as ReportResponse;
  },
);
