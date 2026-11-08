'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

/** "No statement this period": the cycle ending `periodEnd` counts as covered. A repeat call returns the existing skip. */
export const skipStatementPeriod = action('statementSkip.skipStatementPeriod', createDomainAction(
  { fallbackError: "Couldn't mark this period. Try again." },
  async (accountId: string, periodEnd: string): Promise<{ id: string }> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/statement-skips', {
      params: { path: { accountId } },
      body: { periodEnd },
    });
    return { id: (data as { id: string }).id };
  },
));

/** Takes the skip back: the cycle is expected again. */
export const undoStatementSkip = action('statementSkip.undoStatementSkip', createDomainAction(
  { fallbackError: "Couldn't undo this. Try again." },
  async (accountId: string, skipId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/accounts/{accountId}/statement-skips/{skipId}', {
      params: { path: { accountId, skipId } },
    });
  },
));
