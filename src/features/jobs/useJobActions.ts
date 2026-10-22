'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { emitJobStarted } from '@/features/jobs/jobsBus';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

/** Cancel and retry for one job row, with today's toasts and list refresh. */
export function useJobActions() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api.POST('/api/v1/jobs/{id}/cancel', { params: { path: { id } } }).then((r) => r.data!),
    onSuccess: () => {
      toast.info('Cancellation requested');
      queryClient.invalidateQueries({ queryKey: keys.jobs.all });
      router.refresh();
    },
    onError: (err) => toastError(err, 'Failed to cancel job'),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) =>
      api.POST('/api/v1/jobs/{id}/retry', { params: { path: { id } } }).then((r) => r.data!),
    onSuccess: (retried) => {
      toast.success('Job retried');
      emitJobStarted(retried.id);
      queryClient.invalidateQueries({ queryKey: keys.jobs.all });
      router.refresh();
    },
    onError: (err) => toastError(err, 'Failed to retry job'),
  });

  return {
    cancel: (id: string) => cancelMutation.mutate(id),
    retry: (id: string) => retryMutation.mutate(id),
    busy: cancelMutation.isPending || retryMutation.isPending,
  };
}
