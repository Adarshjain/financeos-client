'use client';

import { Loader2, RotateCcw, XCircle } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useJobActions } from '@/features/jobs/useJobActions';
import type { JobResponse } from '@/lib/types';

export function JobRowActions({ job }: { job: JobResponse }) {
  const { cancel, retry, busy: loading } = useJobActions();

  if (job.status === 'PENDING' || job.status === 'RUNNING') {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={loading || job.cancelRequested}
        onClick={() => cancel(job.id)}
        className="h-7 text-2xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1 text-rose-500" /> : <XCircle className="w-3 h-3 mr-1 text-rose-500" />}
        Cancel
      </Button>
    );
  }

  if (job.status === 'FAILED' || job.status === 'CANCELLED') {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => retry(job.id)}
        className="h-7 text-2xs"
      >
        {loading ? <RotateCcw className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
        Retry
      </Button>
    );
  }

  return null;
}
