import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { ActivityScreen } from '@/features/data-sources/sync/ActivityScreen';
import { parseActivityUrl } from '@/features/data-sources/sync/activityUrl';
import { buildJobsQueryParams } from '@/features/jobs/jobsFilterModel';
import { guardSession } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import { jobsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Sync health' };

export default async function DsDataSourcesSyncPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page, size, statusFilter, typeFilter, jobId } = parseActivityUrl(await searchParams);

  // The list, under the key the client hook reads, so first paint needs no refetch.
  const request = buildJobsQueryParams({ page, size, statusFilter, typeFilter });
  const list = await guardSession(jobsApi.list(request));

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.jobs.list(request), list);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ActivityScreen statusFilter={statusFilter} typeFilter={typeFilter} page={page} size={size} jobId={jobId} />
    </HydrationBoundary>
  );
}
