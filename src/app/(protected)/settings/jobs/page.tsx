import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { listJobs } from '@/actions/jobs';
import { buildJobsFilterUrl } from '@/components/jobs/jobUtils';
import { Button } from '@/components/ui/button';
import type { JobResponse } from '@/lib/types';

import { JobsDesktopTable } from './components/JobsDesktopTable';
import { JobsFilterCard } from './components/JobsFilterCard';
import { JobsMobileList } from './components/JobsMobileList';
import {
  AutoRefreshOnActive,
  JobsPageActionBar,
} from './JobsTableClient';

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

  const res = await listJobs({
    page,
    size,
    status: statusFilter,
    type: typeFilter,
  });
  const pagedData =
    res.success && res.data
      ? res.data
      : { content: [], totalPages: 0, totalElements: 0 };
  const jobs: JobResponse[] = pagedData.content || [];
  const totalPages = pagedData.totalPages || 0;

  const hasActive = jobs.some(
    (j) => j.status === 'PENDING' || j.status === 'RUNNING'
  );

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
            href={createFilterUrl(
              undefined,
              undefined,
              Math.min(totalPages - 1, page + 1)
            )}
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
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
      <AutoRefreshOnActive hasActive={hasActive} />

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

      <JobsMobileList
        jobs={jobs}
        totalPages={totalPages}
        renderPagination={renderPagination}
      />

      <JobsDesktopTable jobs={jobs} renderPagination={renderPagination} />
    </div>
  );
}
