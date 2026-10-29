'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { cancelJob, retryJob } from '@/features/jobs/actions';
import { emitJobStarted } from '@/features/jobs/jobsBus';
import { unwrapAction } from '@/lib/actionResult';
import { notify } from '@/lib/notify';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

/** Cancel and retry for one job row, with today's toasts and list refresh. */
export function useJobActions({ onRetried }: { onRetried?: (job: { id: string }) => void } = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const cancelMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(cancelJob(id)),
    onSuccess: () => {
      notify.info('Cancellation requested');
      queryClient.invalidateQueries({ queryKey: keys.jobs.all });
      router.refresh();
    },
    onError: (err) => toastError(err, "Couldn't cancel the job. Try again."),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(retryJob(id)),
    onSuccess: (retried) => {
      notify.success('Job retried');
      emitJobStarted(retried.id);
      queryClient.invalidateQueries({ queryKey: keys.jobs.all });
      if (onRetried) onRetried(retried);
      else router.refresh();
    },
    onError: (err) => toastError(err, "Couldn't retry the job. Try again."),
  });

  return {
    cancel: (id: string) => cancelMutation.mutate(id),
    retry: (id: string) => retryMutation.mutate(id),
    busy: cancelMutation.isPending || retryMutation.isPending,
  };
}
