import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { listJobs } from '@/actions/jobs';
import { JobResultToggle } from '@/components/jobs/JobResultToggle';
import { JobStatusPill } from '@/components/jobs/JobStatusPill';
import { buildJobsFilterUrl, formatDuration, getJobTypeLabel } from '@/components/jobs/jobUtils';
import { Button } from '@/components/ui/button';
import type { JobResponse } from '@/lib/types';

import { AutoRefreshOnActive, JobErrorDetails, JobRowActions, JobsPageActionBar } from './JobsTableClient';

export default async function JobsHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 0;
  const size = Number(params.size) || 20;
  const statusFilter = params.status || '';
  const typeFilter = params.type || '';

  const res = await listJobs({ page, size, status: statusFilter, type: typeFilter });
  const pagedData = res.success && res.data ? res.data : { content: [], totalPages: 0, totalElements: 0 };
  const jobs: JobResponse[] = pagedData.content || [];
  const totalPages = pagedData.totalPages || 0;

  const hasActive = jobs.some((j) => j.status === 'PENDING' || j.status === 'RUNNING');

  const createFilterUrl = (newStatus?: string, newType?: string, newPage = 0) =>
    buildJobsFilterUrl({ statusFilter, typeFilter, size }, { newStatus, newType, newPage });

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
            Monitor execution status, progress, duration, and error logs for all asynchronous tasks.
          </p>
        </div>
      </div>

      {/* Desktop Filter Card */}
      <div className="hidden sm:block space-y-3 bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-medium text-slate-500 mr-1">Status:</span>
          {statusOptions.map((opt) => {
            const isActive = statusFilter === opt.value;
            return (
              <Button
                key={opt.value}
                asChild
                variant={isActive ? 'filter-active' : 'filter'}
                size="xs"
              >
                <Link href={createFilterUrl(opt.value, undefined, 0)}>
                  {opt.label}
                </Link>
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-900">
          <span className="text-2xs font-medium text-slate-500 mr-1">Job Type:</span>
          {typeOptions.map((opt) => {
            const isActive = typeFilter === opt.value;
            return (
              <Button
                key={opt.value}
                asChild
                variant={isActive ? 'filter-active' : 'filter'}
                size="xs"
              >
                <Link href={createFilterUrl(undefined, opt.value, 0)}>
                  {opt.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Mobile card list — the 7-column table can't fit a phone without horizontal scroll */}
      <div className="sm:hidden space-y-2">
        {jobs.length === 0 ? (
          <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 py-8 text-center text-2xs text-slate-500 dark:text-slate-400">
            No background jobs found matching the selected filters.
          </div>
        ) : (
          jobs.map((job) => {
            const hasProgress =
              job.progressTotal != null && job.progressTotal > 0 && job.progressCurrent != null;
            const pct = hasProgress
              ? Math.min(100, Math.round((job.progressCurrent! / job.progressTotal!) * 100))
              : null;
            const isActive = job.status === 'PENDING' || job.status === 'RUNNING';

            return (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-3 space-y-2 text-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <JobStatusPill status={job.status} />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {getJobTypeLabel(job.type)}
                    </span>
                  </div>
                  <JobRowActions job={job} />
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-500 dark:text-slate-400">
                  <span className="whitespace-nowrap">{new Date(job.createdAt).toLocaleString()}</span>
                  <span className="font-mono">{formatDuration(job.startedAt, job.finishedAt)}</span>
                  <span className="font-mono uppercase">{job.triggerSource}</span>
                </div>

                {isActive ? (
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-900">
                    {job.progressNote && (
                      <p className="text-slate-700 dark:text-slate-300 truncate">{job.progressNote}</p>
                    )}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      {pct != null ? (
                        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                      ) : (
                        <div className="bg-primary h-full animate-pulse rounded-full w-2/3" />
                      )}
                    </div>
                  </div>
                ) : job.status === 'SUCCEEDED' ? (
                  <JobResultToggle job={job} />
                ) : (
                  <JobErrorDetails errorCode={job.errorCode} errorMessage={job.errorMessage} />
                )}
              </div>
            );
          })
        )}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {renderPagination()}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-2xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-3 px-4">Job Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Trigger</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Progress / Detail</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No background jobs found matching the selected filters.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const hasProgress =
                    job.progressTotal != null &&
                    job.progressTotal > 0 &&
                    job.progressCurrent != null;
                  const pct = hasProgress
                    ? Math.min(100, Math.round((job.progressCurrent! / job.progressTotal!) * 100))
                    : null;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {getJobTypeLabel(job.type)}
                      </td>
                      <td className="py-3 px-4"><JobStatusPill status={job.status} /></td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-2xs">
                        {job.triggerSource}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {formatDuration(job.startedAt, job.finishedAt)}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {job.status === 'RUNNING' || job.status === 'PENDING' ? (
                          <div className="space-y-1">
                            {job.progressNote && (
                              <p className="text-slate-700 dark:text-slate-300 truncate">
                                {job.progressNote}
                              </p>
                            )}
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              {pct != null ? (
                                <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                              ) : (
                                <div className="bg-primary h-full animate-pulse rounded-full w-2/3" />
                              )}
                            </div>
                          </div>
                        ) : job.status === 'SUCCEEDED' ? (
                          <JobResultToggle job={job} />
                        ) : (
                          <JobErrorDetails errorCode={job.errorCode} errorMessage={job.errorMessage} />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <JobRowActions job={job} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {renderPagination()}
      </div>
    </div>
  );
}
