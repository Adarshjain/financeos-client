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

interface JobsDesktopTableProps {
  jobs: JobResponse[];
  renderPagination: () => React.ReactNode;
}

export function JobsDesktopTable({
  jobs,
  renderPagination,
}: JobsDesktopTableProps) {
  return (
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
                <td
                  colSpan={7}
                  className="py-8 text-center text-slate-500 dark:text-slate-400"
                >
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
                  ? Math.min(
                      100,
                      Math.round(
                        (job.progressCurrent! / job.progressTotal!) * 100
                      )
                    )
                  : null;

                return (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {getJobTypeLabel(job.type)}
                    </td>
                    <td className="py-3 px-4">
                      <JobStatusPill status={job.status} />
                    </td>
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
  );
}
