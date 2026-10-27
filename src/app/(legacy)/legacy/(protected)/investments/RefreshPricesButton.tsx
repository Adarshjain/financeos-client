'use client';

import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useRefreshPrices } from '@/features/investments/useRefreshPrices';

const notify = {
  info: (message: string) => toast.info(message),
  success: (message: string) => toast.success(message),
  warning: (message: string) => toast.warning(message, { duration: 6000 }),
  error: (message: string) => toast.error(message),
};

export function RefreshPricesButton() {
  const { refresh, busy } = useRefreshPrices({ notify });

  return (
    <Button
      type="button"
      onClick={refresh}
      disabled={busy}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
      <span>{busy ? 'Refreshing...' : 'Refresh Prices'}</span>
    </Button>
  );
}
