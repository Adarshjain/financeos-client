'use client';

import { RefreshCw } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { refreshInvestmentPrices } from '@/actions/investments';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export function RefreshPricesButton() {
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await refreshInvestmentPrices();
        if (res.success) {
          const { refreshed, skipped, failed, asOf } = res.data;
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
        } else {
          toast.error(res.error.message);
        }
      } catch (err) {
        toast.error('Failed to refresh prices: ' + (err as Error).message);
      }
    });
  };

  return (
    <Button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      variant="outline"
      className="h-8 text-xs flex items-center gap-1"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
      <span>{isPending ? 'Refreshing...' : 'Refresh Prices'}</span>
    </Button>
  );
}
