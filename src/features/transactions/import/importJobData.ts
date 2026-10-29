import { notFound } from 'next/navigation';

import { guardSession } from '@/features/shell/loadHelpers';
import { ApiError } from '@/lib/api/client';
import { jobsApi } from '@/lib/apiClient';

import { isJobId } from './importModel';

/** The statement import for a route; a missing job, a malformed id or a job of another type is the not-found page. */
export async function loadImportJob(jobId: string) {
  if (!isJobId(jobId)) notFound();
  const job = await guardSession(jobsApi.get(jobId)).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  });
  if (!job || job.type !== 'STATEMENT_INGEST') notFound();
  return job;
}
