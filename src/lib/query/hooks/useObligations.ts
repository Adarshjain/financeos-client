'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { ObligationItemDto } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

/** Upcoming dated obligations within `months`. Key matches the /upcoming server prefetch. */
export function useObligations(months: number, kinds?: string[]) {
  return useQuery({
    queryKey: keys.obligations.upcoming({ months, kinds }),
    queryFn: async (): Promise<ObligationItemDto[]> => {
      const { data } = await api.GET('/api/v1/obligations/upcoming', {
        params: { query: { months, kinds: kinds?.length ? kinds.join(',') : undefined } },
      });
      return data?.items ?? [];
    },
    placeholderData: keepPreviousData,
  });
}
