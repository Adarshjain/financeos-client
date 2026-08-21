'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { refreshInvestmentPrices } from '@/actions/investments';
import { useJobs } from '@/components/jobs/JobsProvider';
import { Button } from '@/components/ui/button';
import { useJobPolling } from '@/hooks/useJobPolling';
import type { PriceRefreshResult } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export function RefreshPricesButton() {
  const [isPending, startTransition] = useTransition();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { notifyJobStarted } = useJobs();
  const { isPolling } = useJobPolling<PriceRefreshResult>(activeJobId, (job) => {
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
    } else if (job.status === 'FAILED') {
      toast.error(job.errorMessage || 'Failed to refresh prices.');
    } else if (job.status === 'CANCELLED') {
      toast.info('Price refresh job was cancelled.');
    }
    setActiveJobId(null);
  });

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await refreshInvestmentPrices();
        if (res.success && res.data?.jobId) {
          const jobId = res.data.jobId;
          setActiveJobId(jobId);
          notifyJobStarted(jobId);
          toast.info('Price refresh started in background.');
        } else if (!res.success) {
          toast.error(res.error.message);
        }
      } catch (err) {
        toast.error('Failed to refresh prices: ' + (err as Error).message);
      }
    });
  };

  const busy = isPending || (Boolean(activeJobId) && isPolling);

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

