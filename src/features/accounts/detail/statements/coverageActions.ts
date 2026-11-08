'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

/** "Nothing happened that month": the month counts as covered. */
export const markMonthEmpty = action('coverage.markMonthEmpty', createDomainAction(
  { fallbackError: "Couldn't mark this month. Try again." },
  async (accountId: string, month: string): Promise<void> => {
    await serverApi.POST('/api/v1/accounts/{id}/coverage/{month}/empty', {
      params: { path: { id: accountId, month } },
    });
  },
));

export const unmarkMonthEmpty = action('coverage.unmarkMonthEmpty', createDomainAction(
  { fallbackError: "Couldn't undo this. Try again." },
  async (accountId: string, month: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/accounts/{id}/coverage/{month}/empty', {
      params: { path: { id: accountId, month } },
    });
  },
));
