'use server';

import { AccountRequest } from '@/lib/account.types';
import { accountsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

export const createAccount = createDomainAction(
  { fallbackError: 'Failed to create account', revalidatePaths: ['/accounts'] },
  (accountRequest: AccountRequest) => accountsApi.create(accountRequest)
);

export const updateAccount = createDomainAction(
  { fallbackError: 'Failed to update account', revalidatePaths: ['/accounts'] },
  (accountId: string, accountRequest: AccountRequest) => accountsApi.update(accountId, accountRequest)
);

export const deleteAccount = createDomainAction(
  { fallbackError: 'Failed to delete account', revalidatePaths: ['/accounts'] },
  (accountId: string) => accountsApi.delete(accountId)
);

export const getCardCycleSummary = createDomainAction(
  { fallbackError: 'Failed to fetch card cycle summary' },
  (accountId: string) => accountsApi.getCardCycleSummary(accountId)
);
