'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { DividendReceiptSummary } from '@/lib/types';

type Params = { brokerAccountId?: string; type?: 'dividend' | 'interest' | 'other'; instrumentId?: string };

/** Receipt-status counts for the current broker/type/instrument filters. */
export function useReceiptSummary(params: Params, initialData: DividendReceiptSummary | undefined) {
  return useQuery({
    queryKey: keys.investments.dividendReceiptSummary(params),
    queryFn: async () =>
      (await api.GET('/api/v1/investments/dividends/receipts/summary', { params: { query: params } }))
        .data! as DividendReceiptSummary,
    initialData,
    placeholderData: keepPreviousData,
  });
}
