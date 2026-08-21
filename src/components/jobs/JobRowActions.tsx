'use client';

import { Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { cancelJob, retryJob } from '@/actions/jobs';
import { useJobs } from '@/components/jobs/JobsProvider';
import { Button } from '@/components/ui/button';
import type { JobResponse } from '@/lib/types';

export function JobRowActions({
  job,
  onActionSuccess,
}: {
  job: JobResponse;
  onActionSuccess?: () => void;
}) {
  const router = useRouter();
  const { notifyJobStarted } = useJobs();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await cancelJob(job.id);
      if (res.success) {
        toast.info('Cancellation requested');
        onActionSuccess?.();
        router.refresh();
      } else {
        toast.error(res.error.message || 'Failed to cancel job');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    try {
      const res = await retryJob(job.id);
      if (res.success && res.data) {
        toast.success('Job retried');
        notifyJobStarted?.(res.data.id);
        onActionSuccess?.();
        router.refresh();
      } else if (!res.success) {
        toast.error(res.error.message || 'Failed to retry job');
      }
    } finally {
      setLoading(false);
    }
  };

  if (job.status === 'PENDING' || job.status === 'RUNNING') {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={loading || job.cancelRequested}
        onClick={handleCancel}
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
        onClick={handleRetry}
        className="h-7 text-2xs"
      >
        {loading ? <RotateCcw className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
        Retry
      </Button>
    );
  }

  return null;
}
