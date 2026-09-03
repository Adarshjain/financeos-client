'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { emitJobStarted } from '@/components/jobs/jobsBus';
import { useJobStatusPolling } from '@/components/jobs/useJobStatusPolling';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { EnqueueResponse, PriceRefreshResult } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export function RefreshPricesButton() {
  const qc = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { isPolling } = useJobStatusPolling<PriceRefreshResult>(
    activeJobId,
    (job) => {
      if (job.status === 'SUCCEEDED' && job.result) {
        const { refreshed, skipped, failed, asOf } = job.result;
        const formattedAsOf = asOf ? formatDate(asOf) : 'today';
        let message = `Updated ${refreshed} price${refreshed === 1 ? '' : 's'} (as of ${formattedAsOf}); ${skipped} skipped.`;

        if (failed && failed.length > 0) {
          const failDetails = failed
            .map((f) => `${f.instrumentName || f.instrumentId}: ${f.reason}`)
            .join(', ');
          message += ` Failed: ${failDetails}`;
          toast.warning(message, { duration: 6000 });
        } else {
          toast.success(message);
        }
        qc.invalidateQueries({ queryKey: keys.investments.all });
      } else if (job.status === 'FAILED') {
        toast.error(job.errorMessage || 'Failed to refresh prices.');
      } else if (job.status === 'CANCELLED') {
        toast.info('Price refresh job was cancelled.');
      }
      setActiveJobId(null);
    }
  );

  const refreshMutation = useMutation({
    mutationFn: () =>
      api
        .POST('/api/v1/investments/prices/refresh', { params: { query: {} } })
        .then((r) => r.data! as EnqueueResponse),
  });

  const handleRefresh = async () => {
    try {
      const data = await refreshMutation.mutateAsync();
      if (data?.jobId) {
        setActiveJobId(data.jobId);
        emitJobStarted(data.jobId);
        toast.info('Price refresh started in background.');
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to refresh prices'
      );
    }
  };

  const busy = refreshMutation.isPending || (Boolean(activeJobId) && isPolling);

  return (
    <Button
      type="button"
      onClick={handleRefresh}
      disabled={busy}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
      <span>{busy ? 'Refreshing...' : 'Refresh Prices'}</span>
    </Button>
  );
}
