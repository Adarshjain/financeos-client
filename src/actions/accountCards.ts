'use server';

import type {
  CloseCardRequest,
  CreateAccountCardRequest,
  UpdateAccountCardRequest,
} from '@/lib/account.types';
import { accountCardsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

export const listAccountCards = createDomainAction(
  { fallbackError: 'Failed to fetch cards' },
  (accountId: string) => accountCardsApi.listByAccount(accountId)
);

export const createAccountCard = createDomainAction(
  { fallbackError: 'Failed to create card', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, data: CreateAccountCardRequest) => accountCardsApi.create(accountId, data)
);

export const updateAccountCard = createDomainAction(
  { fallbackError: 'Failed to update card', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardId: string, data: UpdateAccountCardRequest) => accountCardsApi.update(accountId, cardId, data)
);

export const closeAccountCard = createDomainAction(
  { fallbackError: 'Failed to close card', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardId: string, data: CloseCardRequest) => accountCardsApi.close(accountId, cardId, data)
);

export const deleteAccountCard = createDomainAction(
  { fallbackError: 'Failed to delete card', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardId: string) => accountCardsApi.delete(accountId, cardId)
);
