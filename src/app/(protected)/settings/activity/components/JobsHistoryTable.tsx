'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { buildJobsFilterUrl, buildJobsQueryParams } from '@/components/jobs/jobUtils';
import { PagedSection } from '@/components/reports/views/PagedSection';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { JobResponse } from '@/lib/types';

import { JobsDesktopTable } from './JobsDesktopTable';
import { JobsMobileList } from './JobsMobileList';

interface JobsHistoryTableProps {
  page: number;
  size: number;
  statusFilter: string;
  typeFilter: string;
}

/**
 * Owns the live jobs-history list: seeded from the server prefetch (same
 * query key as the page's `queryClient.setQueryData`), then keeps itself
 * fresh via `refetchInterval` while any visible job is still PENDING/RUNNING
 * — the client-side replacement for the old `AutoRefreshOnActive` component,
 * which drove a full page-refresh polling loop.
 */
export function JobsHistoryTable({ page, size, statusFilter, typeFilter }: JobsHistoryTableProps) {
  const router = useRouter();
  const queryParams = buildJobsQueryParams({ page, size, statusFilter, typeFilter });

  const { data } = useQuery({
    queryKey: keys.jobs.list(queryParams),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/jobs', {
        params: { query: { ...queryParams, sort: ['createdAt,desc'] } },
      });
      return data ?? { content: [], totalPages: 0, totalElements: 0 };
    },
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const jobList = query.state.data?.content ?? [];
      const hasActive = jobList.some((j) => j.status === 'PENDING' || j.status === 'RUNNING');
      return hasActive ? 4000 : false;
    },
    refetchIntervalInBackground: false,
  });

  const jobs: JobResponse[] = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  // The page lives in the URL (?page=), so paging navigates; the pager scrolls itself.
  const goToPage = (newPage: number) =>
    router.push(buildJobsFilterUrl({ statusFilter, typeFilter, size }, { newPage }), { scroll: false });

  return (
    <PagedSection
      className="space-y-2"
      topClassName="px-1"
      bottomClassName="px-1"
      page={{ number: page, size, totalElements, totalPages }}
      onPageChange={goToPage}
      unit="job"
    >
      <JobsMobileList jobs={jobs} />
      <JobsDesktopTable jobs={jobs} />
    </PagedSection>
  );
}
