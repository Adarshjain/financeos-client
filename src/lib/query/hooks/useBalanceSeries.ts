'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import { keys } from '@/lib/query/keys';

/** One day's end-of-day balance (same sign convention as the account's `balance`). */
export type BalancePoint = components['schemas']['BalancePointResponse'];

/**
 * An account's end-of-day balances for the last `days` days, oldest first
 * (GET /accounts/{id}/balance-series). Brokers return an empty list. Keyed under
 * `keys.accounts.all`, so every mutation that refreshes balances refreshes it too.
 */
export function useBalanceSeries(accountId: string, days = 30, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<BalancePoint[]>({
    queryKey: keys.accounts.balanceSeries(accountId, days),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/accounts/{id}/balance-series', {
        params: { path: { id: accountId }, query: { days } },
      });
      return data ?? [];
    },
    enabled: enabled && Boolean(accountId),
  });
}
