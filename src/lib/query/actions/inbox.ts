'use server';

import { serverApi } from '@/lib/api/server';
import type { InboxResponse, InboxSummaryResponse } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';

export const loadInbox = createDomainAction(
  { fallbackError: "Couldn't load the inbox. Try again." },
  async (): Promise<InboxResponse> => {
    const { data } = await serverApi.GET('/api/v1/inbox');
    return data as InboxResponse;
  },
);

export const loadInboxSummary = createDomainAction(
  { fallbackError: "Couldn't load the inbox counts. Try again." },
  async (): Promise<InboxSummaryResponse> => {
    const { data } = await serverApi.GET('/api/v1/inbox/summary');
    return data as InboxSummaryResponse;
  },
);
