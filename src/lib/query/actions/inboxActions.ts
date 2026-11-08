'use server';

import { serverApi } from '@/lib/api/server';
import type { InboxResponse, InboxSummaryResponse } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

export const loadInbox = action('query.inbox.loadInbox', createDomainAction(
  { fallbackError: "Couldn't load the inbox. Try again." },
  async (): Promise<InboxResponse> => {
    const { data } = await serverApi.GET('/api/v1/inbox');
    return data as InboxResponse;
  },
));

export const loadInboxSummary = action('query.inbox.loadInboxSummary', createDomainAction(
  { fallbackError: "Couldn't load the inbox counts. Try again." },
  async (): Promise<InboxSummaryResponse> => {
    const { data } = await serverApi.GET('/api/v1/inbox/summary');
    return data as InboxSummaryResponse;
  },
));
