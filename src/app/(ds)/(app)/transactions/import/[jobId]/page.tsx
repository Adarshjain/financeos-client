import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { loadImportJob } from '@/features/transactions/import/importJobData';
import { ImportJobView } from '@/features/transactions/import/ImportJobView';
import { requireAuth } from '@/lib/auth';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Import result' };

/** /transactions/import/[jobId]: one import. A job that does not exist is a 404. */
export default async function DsImportJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  await requireAuth();
  const { jobId } = await params;
  const job = await loadImportJob(jobId);

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.jobs.byId(jobId), job);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ImportJobView jobId={jobId} />
    </HydrationBoundary>
  );
}
