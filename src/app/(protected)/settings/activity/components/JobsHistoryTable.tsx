'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import React from 'react';

import { buildJobsFilterUrl, buildJobsQueryParams } from '@/components/jobs/jobUtils';
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

  const createFilterUrl = (newStatus?: string, newType?: string, newPage = 0) =>
    buildJobsFilterUrl({ statusFilter, typeFilter, size }, { newStatus, newType, newPage });

  const renderPagination = () =>
    totalPages > 1 && (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-2xs bg-slate-50/50 dark:bg-slate-900/50">
        <span className="text-slate-500">
          Page {page + 1} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={createFilterUrl(undefined, undefined, Math.max(0, page - 1))}
            className={`px-2.5 py-1 rounded border text-2xs font-medium ${
              page === 0
                ? 'pointer-events-none opacity-40 text-slate-400 border-slate-200 dark:border-slate-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Previous
          </Link>
          <Link
            href={createFilterUrl(undefined, undefined, Math.min(totalPages - 1, page + 1))}
            className={`px-2.5 py-1 rounded border text-2xs font-medium ${
              page >= totalPages - 1
                ? 'pointer-events-none opacity-40 text-slate-400 border-slate-200 dark:border-slate-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Next
          </Link>
        </div>
      </div>
    );

  return (
    <>
      <JobsMobileList jobs={jobs} totalPages={totalPages} renderPagination={renderPagination} />
      <JobsDesktopTable jobs={jobs} renderPagination={renderPagination} />
    </>
  );
}
