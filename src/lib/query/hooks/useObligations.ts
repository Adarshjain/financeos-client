'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { loadUpcomingObligations } from '@/lib/query/actions/obligationActions';
import { keys } from '@/lib/query/keys';

/** Upcoming dated obligations within `months`. Key matches the /upcoming server prefetch. */
export function useObligations(months: number, kinds?: string[]) {
  return useQuery({
    queryKey: keys.obligations.upcoming({ months, kinds }),
    queryFn: () => unwrapAction(loadUpcomingObligations(months, kinds)),
    placeholderData: keepPreviousData,
  });
}
