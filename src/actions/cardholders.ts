'use server';

import type {
  CloseCardholderRequest,
  CloseCardRequest,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';
import { cardholdersApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

export const listCardholders = createDomainAction(
  { fallbackError: 'Failed to fetch cardholders' },
  (accountId: string) => cardholdersApi.listByAccount(accountId)
);

export const addAddonCardholder = createDomainAction(
  { fallbackError: 'Failed to add add-on cardholder', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, data: CreateCardholderRequest) => cardholdersApi.addAddon(accountId, data)
);

export const updateCardholder = createDomainAction(
  { fallbackError: 'Failed to update cardholder', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardholderId: string, data: UpdateCardholderRequest) => cardholdersApi.update(accountId, cardholderId, data)
);

export const closeCardholder = createDomainAction(
  { fallbackError: 'Failed to close cardholder', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardholderId: string, data?: CloseCardholderRequest) => cardholdersApi.close(accountId, cardholderId, data)
);

export const reopenCardholder = createDomainAction(
  { fallbackError: 'Failed to reopen cardholder', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardholderId: string) => cardholdersApi.reopen(accountId, cardholderId)
);

export const deleteCardholder = createDomainAction(
  { fallbackError: 'Failed to delete cardholder', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardholderId: string) => cardholdersApi.delete(accountId, cardholderId)
);

export const addCard = createDomainAction(
  { fallbackError: 'Failed to issue card', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardholderId: string, data: CreateCardRequest) => cardholdersApi.addCard(accountId, cardholderId, data)
);

export const replaceCard = createDomainAction(
  { fallbackError: 'Failed to replace card', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardholderId: string, cardId: string, data: ReplaceCardRequest) => cardholdersApi.replaceCard(accountId, cardholderId, cardId, data)
);

export const closeCard = createDomainAction(
  { fallbackError: 'Failed to close card', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardholderId: string, cardId: string, data?: CloseCardRequest) => cardholdersApi.closeCard(accountId, cardholderId, cardId, data)
);

export const deleteCard = createDomainAction(
  { fallbackError: 'Failed to delete card', revalidatePaths: ['/accounts', '/transactions', '/rewards'] },
  (accountId: string, cardholderId: string, cardId: string) => cardholdersApi.deleteCard(accountId, cardholderId, cardId)
);
