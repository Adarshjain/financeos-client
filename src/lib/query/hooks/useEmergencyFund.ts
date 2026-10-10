'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import { keys } from '@/lib/query/keys';

/** One of the last six full months: `month` is YYYY-MM; `beforeHistory` months (before the first liquid-account transaction) are left out of the median. */
export type EmergencyFundMonth = components['schemas']['MonthOutflow'];

/**
 * GET /insights/emergency-fund. `monthsCovered` and `band` (low < 3 months,
 * medium 3–6, high ≥ 6) are null when `historyMonths` is 0 or the median outflow
 * is not positive.
 */
export type EmergencyFund = components['schemas']['EmergencyFundResponse'];

/** How many months the liquid (bank + wallet/cash) balance covers at the usual monthly outflow. */
export function useEmergencyFund() {
  return useQuery<EmergencyFund>({
    queryKey: keys.insights.emergencyFund(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/insights/emergency-fund');
      return data as EmergencyFund;
    },
  });
}
