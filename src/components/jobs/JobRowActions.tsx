'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RotateCcw, XCircle } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { emitJobStarted } from '@/components/jobs/jobsBus';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { JobResponse } from '@/lib/types';

export function JobRowActions({ job }: { job: JobResponse }) {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api.POST('/api/v1/jobs/{id}/cancel', { params: { path: { id } } }).then((r) => r.data!),
    onSuccess: () => {
      toast.info('Cancellation requested');
      queryClient.invalidateQueries({ queryKey: keys.jobs.all });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.response.message : 'Failed to cancel job'),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) =>
      api.POST('/api/v1/jobs/{id}/retry', { params: { path: { id } } }).then((r) => r.data!),
    onSuccess: (retried) => {
      toast.success('Job retried');
      emitJobStarted(retried.id);
      queryClient.invalidateQueries({ queryKey: keys.jobs.all });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.response.message : 'Failed to retry job'),
  });

  const loading = cancelMutation.isPending || retryMutation.isPending;

  if (job.status === 'PENDING' || job.status === 'RUNNING') {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={loading || job.cancelRequested}
        onClick={() => cancelMutation.mutate(job.id)}
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
        onClick={() => retryMutation.mutate(job.id)}
        className="h-7 text-2xs"
      >
        {loading ? <RotateCcw className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
        Retry
      </Button>
    );
  }

  return null;
}
