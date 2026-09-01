'use server';

import { AccountRequest, CloseAccountRequest } from '@/lib/account.types';
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

export const closeAccount = createDomainAction(
  { fallbackError: 'Failed to close account', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, data?: CloseAccountRequest) => accountsApi.close(accountId, data)
);

export const reopenAccount = createDomainAction(
  { fallbackError: 'Failed to reopen account', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string) => accountsApi.reopen(accountId)
);

export const deleteAccount = createDomainAction(
  { fallbackError: 'Failed to delete account', revalidatePaths: ['/accounts'] },
  (accountId: string) => accountsApi.delete(accountId)
);

export const getCardCycleSummary = createDomainAction(
  { fallbackError: 'Failed to fetch card cycle summary' },
  (accountId: string) => accountsApi.getCardCycleSummary(accountId)
);

export const previewGmailCleanup = createDomainAction(
  { fallbackError: 'Failed to preview Gmail cleanup' },
  (accountId: string, before: string) => accountsApi.gmailCleanupPreview(accountId, before)
);

export const executeGmailCleanup = createDomainAction(
  { fallbackError: 'Failed to execute Gmail cleanup', revalidatePaths: ['/accounts', '/transactions'] },
  (accountId: string, before: string) => accountsApi.gmailCleanup(accountId, before)
);
