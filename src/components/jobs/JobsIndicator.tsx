'use client';

import { Activity, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

import { useJobs } from '@/components/jobs/JobsProvider';
import { getJobTypeLabel } from '@/components/jobs/jobUtils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function JobsIndicator() {
  const { activeJobs, cancelActiveJob } = useJobs();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  if (activeJobs.length === 0) {
    return null;
  }

  const handleCancel = async (jobId: string) => {
    setCancellingId(jobId);
    try {
      await cancelActiveJob(jobId);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-2xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Active Jobs</span>
          </div>
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-2xs font-bold bg-primary/10 text-primary rounded-full">
            {activeJobs.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 shadow-lg rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" align="start">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 font-semibold text-2xs text-slate-900 dark:text-slate-100">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>In-Progress Jobs ({activeJobs.length})</span>
          </div>
          <Link
            href="/settings/jobs"
            className="text-2xs text-primary hover:underline font-medium"
          >
            View all →
          </Link>
        </div>

        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {activeJobs.map((job) => {
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
                className="p-2 rounded bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {getJobTypeLabel(job.type)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cancellingId === job.id || job.cancelRequested}
                    onClick={() => handleCancel(job.id)}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                    title="Cancel Job"
                  >
                    {cancellingId === job.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                    ) : (
                      <X className="w-3 h-3 text-rose-500" />
                    )}
                  </Button>
                </div>

                {job.progressNote && (
                  <p className="text-slate-500 dark:text-slate-400 truncate">
                    {job.progressNote}
                  </p>
                )}

                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  {pct != null ? (
                    <div
                      className="bg-primary h-full transition-all duration-300 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  ) : (
                    <div className="bg-primary h-full animate-pulse rounded-full w-2/3" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
