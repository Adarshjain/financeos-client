import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { loadImportJob } from '@/features/transactions/import/importJobData';
import { ImportJobScreen } from '@/features/transactions/import/ImportJobScreen';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Import result' };

/** /transactions/import/[id]: one import. A job that does not exist is a 404. */
export default async function DsImportJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;
  const job = await loadImportJob(jobId);

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.jobs.byId(jobId), job);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ImportJobScreen jobId={jobId} />
    </HydrationBoundary>
  );
}
