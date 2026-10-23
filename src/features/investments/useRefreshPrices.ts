'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { emitJobStarted } from '@/features/jobs/jobsBus';
import { useJobStatusPolling } from '@/features/jobs/useJobStatusPolling';
import { api } from '@/lib/api/client';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { toastError } from '@/lib/toastError';
import type { EnqueueResponse, PriceRefreshResult } from '@/lib/types';
import { formatDate } from '@/lib/utils';

/** How the refresh reports progress: the Legacy button sends it to the old toaster, Dinero to its own. */
export interface RefreshNotifier {
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
}

export interface UseRefreshPricesOptions {
  notify: RefreshNotifier;
  /** Called once the job has finished, after the investment queries are invalidated. */
  onSettled?: () => void;
}

/** What the price-refresh job did, as one line. */
export function refreshResultMessage(result: PriceRefreshResult): { message: string; failed: boolean } {
  const { refreshed, skipped, failed, asOf } = result;
  const formattedAsOf = asOf ? formatDate(asOf) : 'today';
  let message = `Updated ${refreshed} price${refreshed === 1 ? '' : 's'} (as of ${formattedAsOf}); ${skipped} skipped.`;
  if (failed && failed.length > 0) {
    const failDetails = failed.map((f) => `${f.instrumentName || f.instrumentId}: ${f.reason}`).join(', ');
    message += ` Failed: ${failDetails}`;
    return { message, failed: true };
  }
  return { message, failed: false };
}

/**
 * Starts the price-refresh job and follows it to the end, reporting through `notify`. `jobId` is the job this
 * session started (null until then); `busy` is true from the click until the job has finished.
 */
export function useRefreshPrices({ notify, onSettled }: UseRefreshPricesOptions) {
  const qc = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [startedJobId, setStartedJobId] = useState<string | null>(null);

  const { isPolling } = useJobStatusPolling<PriceRefreshResult>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED' && job.result) {
      const { message, failed } = refreshResultMessage(job.result);
      if (failed) notify.warning(message);
      else notify.success(message);
      void invalidateInvestmentQueries(qc);
    } else if (job.status === 'FAILED') {
      notify.error(job.errorMessage || 'Failed to refresh prices.');
    } else if (job.status === 'CANCELLED') {
      notify.info('Price refresh job was cancelled.');
    }
    setActiveJobId(null);
    onSettled?.();
  });

  const refreshMutation = useMutation({
    mutationFn: () =>
      api.POST('/api/v1/investments/prices/refresh', { params: { query: {} } }).then((r) => r.data! as EnqueueResponse),
  });

  const refresh = async () => {
    try {
      const data = await refreshMutation.mutateAsync();
      if (data?.jobId) {
        setActiveJobId(data.jobId);
        setStartedJobId(data.jobId);
        emitJobStarted(data.jobId);
        notify.info('Price refresh started in background.');
      }
    } catch (err) {
      toastError(err, 'Failed to refresh prices');
    }
  };

  const busy = refreshMutation.isPending || (Boolean(activeJobId) && isPolling);
  return { refresh, busy, jobId: startedJobId };
}
