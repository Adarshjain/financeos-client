import { cache } from 'react';

import type { Account } from '@/lib/account.types';
import { accountsApi } from '@/lib/apiClient';

/** The account for this route, or null when it is missing or the request failed. One request per render pass. */
export const loadAccount = cache(async (id: string): Promise<Account | null> => {
  const account = await accountsApi.get(id).catch(() => null);
  return account ?? null;
});
