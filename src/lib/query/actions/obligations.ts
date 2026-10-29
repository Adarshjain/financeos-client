'use server';

import { serverApi } from '@/lib/api/server';
import type { ObligationItemDto } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';

/** Upcoming dated obligations within `months`, optionally limited to some kinds. */
export const loadUpcomingObligations = createDomainAction(
  { fallbackError: "Couldn't load upcoming items. Try again." },
  async (months: number, kinds?: string[]): Promise<ObligationItemDto[]> => {
    const { data } = await serverApi.GET('/api/v1/obligations/upcoming', {
      params: { query: { months, kinds: kinds?.length ? kinds.join(',') : undefined } },
    });
    return data?.items ?? [];
  },
);
