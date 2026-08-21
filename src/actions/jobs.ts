'use server';

import { jobsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

const JOBS_PATHS = ['/settings/jobs'];

export const getJob = createDomainAction(
  { fallbackError: 'Failed to fetch job details' },
  (id: string) => jobsApi.get(id)
);

export const listJobs = createDomainAction(
  { fallbackError: 'Failed to list jobs' },
  (params: { page?: number; size?: number; status?: string; type?: string } = {}) =>
    jobsApi.list(params)
);

export const listActiveJobs = createDomainAction(
  { fallbackError: 'Failed to fetch active jobs' },
  () => jobsApi.listActive()
);

export const cancelJob = createDomainAction(
  { fallbackError: 'Failed to cancel job', revalidatePaths: JOBS_PATHS },
  (id: string) => jobsApi.cancel(id)
);

export const retryJob = createDomainAction(
  { fallbackError: 'Failed to retry job', revalidatePaths: JOBS_PATHS },
  (id: string) => jobsApi.retry(id)
);
