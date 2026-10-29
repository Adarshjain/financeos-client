'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { loadJobs } from '@/features/jobs/actions';
import { buildJobsQueryParams } from '@/features/jobs/jobUtils';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';
import type { JobResponse } from '@/lib/types';

export interface JobsHistoryFilters {
  page: number;
  size: number;
  statusFilter: string;
  typeFilter: string;
  since?: string;
}

/**
 * The paged jobs history, seeded from the server prefetch (same query key as the page's
 * `queryClient.setQueryData`) and kept fresh by a steady 5s `refetchInterval` while the tab is in view.
 */
export function useJobsHistory(filters: JobsHistoryFilters) {
  const queryParams = buildJobsQueryParams(filters);

  const query = useQuery({
    queryKey: keys.jobs.list(queryParams),
    queryFn: async () => {
      const data = await unwrapAction(loadJobs({ ...queryParams, sort: ['createdAt,desc'] }));
      return data ?? { content: [], totalPages: 0, totalElements: 0 };
    },
    placeholderData: keepPreviousData,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  const jobs: JobResponse[] = query.data?.content ?? [];
  return {
    jobs,
    totalPages: query.data?.totalPages ?? 0,
    totalElements: query.data?.totalElements ?? 0,
    isPending: query.isPending,
  };
}

