import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { buildJobsFilterUrl, buildJobsQueryParams } from '@/components/jobs/jobUtils';
import { Button } from '@/components/ui/button';
import { jobsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

import { JobsFilterCard } from './components/JobsFilterCard';
import { JobsHistoryTable } from './components/JobsHistoryTable';
import { JobsPageActionBar } from './JobsTableClient';

export default async function JobsHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    size?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 0;
  const size = Number(params.size) || 20;
  const statusFilter = params.status || '';
  const typeFilter = params.type || '';

  const queryParams = buildJobsQueryParams({ page, size, statusFilter, typeFilter });
  const pagedData = await jobsApi.list(queryParams);

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.jobs.list(queryParams), pagedData);

  const createFilterUrl = (
    newStatus?: string,
    newType?: string,
    newPage = 0
  ) =>
    buildJobsFilterUrl(
      { statusFilter, typeFilter, size },
      { newStatus, newType, newPage }
    );

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Succeeded', value: 'SUCCEEDED' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const typeOptions = [
    { label: 'All Types', value: '' },
    { label: 'Statement Ingest', value: 'STATEMENT_INGEST' },
    { label: 'Gmail Sync', value: 'GMAIL_SYNC' },
    { label: 'Price Refresh', value: 'PRICE_REFRESH' },
    { label: 'Import Commit', value: 'INVESTMENT_IMPORT_COMMIT' },
    { label: 'Reconcile Commit', value: 'BROKER_RECONCILE_COMMIT' },
    { label: 'Rule Apply', value: 'RULE_APPLY' },
  ];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
        <JobsPageActionBar
          statusOptions={statusOptions}
          typeOptions={typeOptions}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          size={size}
        />

        <div className="flex items-start gap-2">
          <Button asChild size="icon-sm" variant="ghost">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Background Jobs History
            </h1>
            <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitor execution status, progress, duration, and error logs for all
              asynchronous tasks.
            </p>
          </div>
        </div>

        <JobsFilterCard
          statusOptions={statusOptions}
          typeOptions={typeOptions}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          createFilterUrl={createFilterUrl}
        />

        <JobsHistoryTable page={page} size={size} statusFilter={statusFilter} typeFilter={typeFilter} />
      </div>
    </HydrationBoundary>
  );
}
