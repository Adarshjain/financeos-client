'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { loadRecurringProposals } from '@/lib/query/actions/recurringActions';
import { keys } from '@/lib/query/keys';

/** Regular payments proposed for tracking. Key matches the /upcoming server prefetch. */
export function useRecurringProposals() {
  return useQuery({
    queryKey: keys.recurring.proposals(),
    queryFn: () => unwrapAction(loadRecurringProposals()),
  });
}
