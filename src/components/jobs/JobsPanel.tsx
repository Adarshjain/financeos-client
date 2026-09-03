'use client';

import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { JobErrorDetails } from '@/components/jobs/JobErrorDetails';
import { JobRowActions } from '@/components/jobs/JobRowActions';
import { JobStatusPill } from '@/components/jobs/JobStatusPill';
import { formatDuration, getJobTypeLabel } from '@/components/jobs/jobUtils';
import { JobResultDetails } from '@/components/jobs/results';
import { useJobsListPolling } from '@/components/jobs/useJobsListPolling';
import { Button } from '@/components/ui/button';
import type { JobType } from '@/lib/types';

interface JobsPanelProps {
  types: JobType[];
  title: string;
}

export function JobsPanel({ types, title }: JobsPanelProps) {
  const { jobs, loading, expandedJobIds, toggleExpand } = useJobsListPolling({ types, size: 5 });

  const hasLocalActiveJob = jobs.some((j) => j.status === 'PENDING' || j.status === 'RUNNING');

  const viewAllHref =
    types.length === 1 ? `/settings/jobs?type=${types[0]}` : '/settings/jobs';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 space-y-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {title}
          </h3>
          {hasLocalActiveJob && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
              <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
              Live
            </span>
          )}
        </div>
        <Link
          href={viewAllHref}
          className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          View all →
        </Link>
      </div>

      {/* Body */}
      {loading ? (
        <div className="py-4 text-center text-2xs text-slate-400">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="py-3 text-center text-2xs text-slate-400 italic">
          No {title.toLowerCase()} yet.
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const isExpanded = expandedJobIds.has(job.id);
            const isActive = job.status === 'PENDING' || job.status === 'RUNNING';
            const hasProgress =
              job.progressTotal != null &&
              job.progressTotal > 0 &&
              job.progressCurrent != null;
            const pct = hasProgress
              ? Math.min(100, Math.round((job.progressCurrent! / job.progressTotal!) * 100))
              : null;

            return (
              <div
                key={job.id}
                className="p-2.5 sm:p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/20 space-y-2 text-2xs"
              >
                {/* Main Summary Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <JobStatusPill status={job.status} />

                    {types.length > 1 && (
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {getJobTypeLabel(job.type)}
                      </span>
                    )}

                    <span className="text-slate-400 tabular-nums truncate">
                      {new Date(job.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <span className="text-slate-400 font-mono text-2xs">
                      {formatDuration(job.startedAt, job.finishedAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <JobRowActions job={job} />

                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleExpand(job.id)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress bar during PENDING/RUNNING */}
                {isActive && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-900">
                    {job.progressNote && (
                      <p className="text-slate-600 dark:text-slate-400 font-medium truncate">
                        {job.progressNote}
                      </p>
                    )}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      {pct != null ? (
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      ) : (
                        <div className="bg-emerald-500 h-full animate-pulse rounded-full w-2/3" />
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Details for Terminal Jobs */}
                {!isActive && isExpanded && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-900 space-y-2">
                    {(job.status === 'FAILED' || job.status === 'CANCELLED') && (
                      <JobErrorDetails
                        errorCode={job.errorCode}
                        errorMessage={job.errorMessage}
                      />
                    )}
                    {job.status === 'SUCCEEDED' && <JobResultDetails job={job} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
