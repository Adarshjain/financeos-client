import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import React from 'react';

import { guardSession } from '@/features/shell/loadHelpers';
import { ImportJobView } from '@/features/transactions/import/ImportJobView';
import { isJobId } from '@/features/transactions/import/importModel';
import { ApiError } from '@/lib/api/client';
import { jobsApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';
import { getQueryClient, keys } from '@/lib/query';

/** /ds/transactions/import/[jobId]: one import. A job that does not exist is a 404. */
export default async function DsImportJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  await requireAuth();
  const { jobId } = await params;
  if (!isJobId(jobId)) notFound();
  const job = await guardSession(jobsApi.get(jobId)).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  });
  if (!job || job.type !== 'STATEMENT_INGEST') notFound();

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.jobs.byId(jobId), job);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ImportJobView jobId={jobId} />
    </HydrationBoundary>
  );
}
