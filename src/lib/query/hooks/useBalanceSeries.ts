'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { components } from '@/lib/api/schema';
import { loadBalanceSeries } from '@/lib/query/actions/accounts';
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
    queryFn: () => unwrapAction(loadBalanceSeries(accountId, days)),
    enabled: enabled && Boolean(accountId),
  });
}
