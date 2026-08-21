'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

import { JobResultDetails } from '@/components/jobs/results';
import type { JobResponse } from '@/lib/types';

/**
 * Expandable result detail for a SUCCEEDED job — the counterpart of
 * JobErrorDetails, rendering the per-type result via the shared registry.
 */
export function JobResultToggle({ job }: { job: JobResponse }) {
  const [expanded, setExpanded] = useState(false);

  if (job.result == null) {
    return (
      <span className="text-2xs text-slate-600 dark:text-slate-400">
        {job.progressNote || 'Completed successfully'}
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center text-2xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium focus:outline-none"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 mr-0.5" />
        ) : (
          <ChevronRight className="w-3 h-3 mr-0.5" />
        )}
        {expanded ? 'Hide result' : 'View result'}
      </button>
      {expanded && (
        <div className="mt-1.5">
          <JobResultDetails job={job} />
        </div>
      )}
    </div>
  );
}
