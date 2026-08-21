import React from 'react';

import type { JobStatus } from '@/lib/types';

export function JobStatusPill({ status }: { status: JobStatus }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
          PENDING
        </span>
      );
    case 'RUNNING':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 animate-pulse">
          RUNNING
        </span>
      );
    case 'SUCCEEDED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
          SUCCEEDED
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
          FAILED
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          CANCELLED
        </span>
      );
    default:
      return <span className="text-2xs">{status}</span>;
  }
}
