import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { buildJobsQueryParams } from '@/features/jobs/jobsFilterModel';
import { ActivityScreen } from '@/features/settings/activity/ActivityScreen';
import { parseActivityUrl } from '@/features/settings/activity/activityUrl';
import { guardSession } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import { jobsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Activity' };

export default async function DsSettingsActivityPage({
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
