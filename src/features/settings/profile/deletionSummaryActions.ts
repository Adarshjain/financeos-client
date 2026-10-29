'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';

/** What deleting the account removes (shown while the delete dialog is open). */
export const loadDeletionSummary = createDomainAction(
  { fallbackError: "Couldn't load what deleting removes. Try again." },
  async () => (await serverApi.GET('/api/v1/auth/me/deletion-summary')).data ?? null,
);
