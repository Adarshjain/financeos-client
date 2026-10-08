import React from 'react';

import { JobResultToggle } from '@/components/jobs/JobResultToggle';
import { JobStatusPill } from '@/components/jobs/JobStatusPill';
import {
  formatDuration,
  getJobTypeLabel,
} from '@/components/jobs/jobUtils';
import type { JobResponse } from '@/lib/types';

import {
  JobErrorDetails,
  JobRowActions,
} from '../JobsTableClient';

interface JobsMobileListProps {
  jobs: JobResponse[];
  totalPages: number;
  renderPagination: () => React.ReactNode;
}

export function JobsMobileList({
  jobs,
  totalPages,
  renderPagination,
}: JobsMobileListProps) {
  return (
    <div className="sm:hidden space-y-2">
      {jobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 py-8 text-center text-2xs text-slate-500 dark:text-slate-400">
          No background jobs found matching the selected filters.
        </div>
      ) : (
        jobs.map((job) => {
          const hasProgress =
            job.progressTotal != null &&
            job.progressTotal > 0 &&
            job.progressCurrent != null;
          const pct = hasProgress
            ? Math.min(
                100,
                Math.round(
                  (job.progressCurrent! / job.progressTotal!) * 100
                )
              )
            : null;
          const isActive =
            job.status === 'PENDING' || job.status === 'RUNNING';

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
                <span className="whitespace-nowrap">
                  {new Date(job.createdAt).toLocaleString()}
                </span>
                <span className="font-mono">
                  {formatDuration(job.startedAt, job.finishedAt)}
                </span>
                <span className="font-mono uppercase">
                  {job.triggerSource}
                </span>
              </div>

              {isActive ? (
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-900">
                  {job.progressNote && (
                    <p className="text-slate-700 dark:text-slate-300 truncate">
                      {job.progressNote}
                    </p>
                  )}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    {pct != null ? (
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    ) : (
                      <div className="bg-primary h-full animate-pulse rounded-full w-2/3" />
                    )}
                  </div>
                </div>
              ) : job.status === 'SUCCEEDED' ? (
                <JobResultToggle job={job} />
              ) : (
                <JobErrorDetails
                  errorCode={job.errorCode}
                  errorMessage={job.errorMessage}
                />
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
  );
}
