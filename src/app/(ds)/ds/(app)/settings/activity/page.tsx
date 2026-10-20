import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { buildJobsQueryParams } from '@/features/jobs/jobUtils';
import { ACTIVITY_DEFAULT_SIZE } from '@/features/settings/activity/activityModel';
import { ActivityPage } from '@/features/settings/activity/ActivityPage';
import { jobsApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';
import { getQueryClient, keys } from '@/lib/query';

export default async function DsSettingsActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; status?: string; type?: string; job?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const page = Number(params.page) || 0;
  const size = Number(params.size) || ACTIVITY_DEFAULT_SIZE;
  const statusFilter = params.status || '';
  const typeFilter = params.type || '';

  // The list and the two menu counts, under the keys the client hooks read, so first paint needs no refetch.
  const requests = [
    { page, size, statusFilter, typeFilter },
    { page: 0, size: 1, statusFilter: 'active', typeFilter },
    { page: 0, size: 1, statusFilter: 'FAILED', typeFilter },
  ].map((filters) => buildJobsQueryParams(filters));
  const [list, running, failed] = await Promise.all(requests.map((q) => jobsApi.list(q)));

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.jobs.list(requests[0]), list);
  queryClient.setQueryData(keys.jobs.list(requests[1]), running);
  queryClient.setQueryData(keys.jobs.list(requests[2]), failed);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ActivityPage statusFilter={statusFilter} typeFilter={typeFilter} page={page} size={size} jobId={params.job || null} />
    </HydrationBoundary>
  );
}
