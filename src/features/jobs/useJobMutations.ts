'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelJob, retryJob } from '@/features/jobs/jobActions';
import { emitJobStarted } from '@/features/jobs/jobsBus';
import { unwrapAction } from '@/lib/actionResult';
import { notify } from '@/lib/notify';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

/** Cancel and retry for one job row, with today's toasts and list refresh. */
export function useJobMutations({ onRetried }: { onRetried?: (job: { id: string }) => void } = {}) {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(cancelJob(id)),
    // Returned so the spinner lasts until the refreshed list is in.
    onSuccess: () => {
      notify.info('Cancellation requested');
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.jobs.all }),
        queryClient.invalidateQueries({ queryKey: keys.shell.counts() }),
      ]);
    },
    onError: (err) => toastError(err, "Couldn't cancel the job. Try again."),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(retryJob(id)),
    onSuccess: (retried) => {
      notify.success('Job retried');
      emitJobStarted(retried.id);
      onRetried?.(retried);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.jobs.all }),
        queryClient.invalidateQueries({ queryKey: keys.shell.counts() }),
      ]);
    },
    onError: (err) => toastError(err, "Couldn't retry the job. Try again."),
  });

  return {
    cancel: (id: string) => cancelMutation.mutate(id),
    retry: (id: string) => retryMutation.mutate(id),
    busy: cancelMutation.isPending || retryMutation.isPending,
  };
}
