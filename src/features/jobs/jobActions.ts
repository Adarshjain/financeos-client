'use server';

import { serverApi } from '@/lib/api/server';
import type { JobResponse } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';

interface JobsQuery {
  page?: number;
  size?: number;
  status?: string;
  type?: string;
  since?: string;
  sort?: string[];
}

/** One job by id (the poll of a running job). */
export const loadJob = createDomainAction(
  { fallbackError: "Couldn't load the job. Try again." },
  async (id: string): Promise<JobResponse> => {
    const { data } = await serverApi.GET('/api/v1/jobs/{id}', { params: { path: { id } } });
    return data as JobResponse;
  },
);

/** A page of jobs, filtered as the caller says; null when the server sends no body. */
export const loadJobs = createDomainAction(
  { fallbackError: "Couldn't load jobs. Try again." },
  async (query: JobsQuery) => {
    const { data } = await serverApi.GET('/api/v1/jobs', { params: { query: query as never } });
    return data ?? null;
  },
);

export const cancelJob = createDomainAction(
  { fallbackError: "Couldn't cancel the job. Try again." },
  async (id: string): Promise<JobResponse> => {
    const { data } = await serverApi.POST('/api/v1/jobs/{id}/cancel', { params: { path: { id } } });
    return data!;
  },
);

export const retryJob = createDomainAction(
  { fallbackError: "Couldn't retry the job. Try again." },
  async (id: string): Promise<JobResponse> => {
    const { data } = await serverApi.POST('/api/v1/jobs/{id}/retry', { params: { path: { id } } });
    return data!;
  },
);
