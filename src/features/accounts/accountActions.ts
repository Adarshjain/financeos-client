'use server';

import type {
  Account,
  AccountRequest,
  Cardholder,
  CloseAccountRequest,
  CloseCardholderRequest,
  CloseCardRequest,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';
import type { components } from '@/lib/api/schema';
import { serverApi } from '@/lib/api/server';
import type { AccountIdentifierResponse, CreateAccountIdentifierRequest, Schemas } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type { CardCycleSummary, StatementDetail, StatementSummary } from '@/lib/statement.types';
import type { BulkReattributeCardRequest, BulkReattributeResponse } from '@/lib/transaction.types';
import type { GmailCleanupPreview, GmailCleanupResult } from '@/lib/types';

type StatementDeletionPreview = components['schemas']['StatementDeletionPreviewResponse'];
type StatementDeletionResult = components['schemas']['StatementDeletionResponse'];

// Account identifiers

export const loadAccountIdentifiers = createDomainAction(
  { fallbackError: "Couldn't load the account identifiers. Try again." },
  async (accountId: string): Promise<AccountIdentifierResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{id}/identifiers', { params: { path: { id: accountId } } });
    return data ?? [];
  },
);

export const addAccountIdentifier = createDomainAction(
  { fallbackError: "Couldn't add the identifier. Try again." },
  async (accountId: string, body: CreateAccountIdentifierRequest) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{id}/identifiers', {
      params: { path: { id: accountId } },
      body,
    });
    return data;
  },
);

export const removeAccountIdentifier = createDomainAction(
  { fallbackError: "Couldn't remove the identifier. Try again." },
  async (accountId: string, identifierId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/accounts/{id}/identifiers/{identifierId}', {
      params: { path: { id: accountId, identifierId } },
    });
  },
);

// Account lifecycle

/**
 * Creates the account, then saves any identifier aliases collected in the create form (the account id
 * doesn't exist until now). Alias failures do not roll the account back; they are returned so the form
 * can tell the user which values to re-add from the edit form.
 */
export const createAccountWithIdentifiers = createDomainAction(
  { fallbackError: "Couldn't create the account. Try again." },
  async (body: AccountRequest, identifiers: string[]): Promise<{ account: Account; failedIdentifiers: string[] }> => {
    const { data } = await serverApi.POST('/api/v1/accounts', { body: body as Schemas['BankAccountRequest'] });
    const account = data as Account;
    const failedIdentifiers: string[] = [];
    for (const value of identifiers) {
      try {
        await serverApi.POST('/api/v1/accounts/{id}/identifiers', { params: { path: { id: account.id } }, body: { value } });
      } catch {
        // Deliberate: a failed alias must not undo the created account; the caller lists it for re-adding.
        failedIdentifiers.push(value);
      }
    }
    return { account, failedIdentifiers };
  },
);

export const updateAccount = createDomainAction(
  { fallbackError: "Couldn't update the account. Try again." },
  async (id: string, body: AccountRequest) => {
    const { data } = await serverApi.PUT('/api/v1/accounts/{id}', {
      params: { path: { id } },
      body: body as Schemas['BankAccountRequest'],
    });
    return data as Account;
  },
);

export const closeAccount = createDomainAction(
  { fallbackError: "Couldn't close the account. Try again." },
  async (id: string, body?: CloseAccountRequest) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{id}/close', { params: { path: { id } }, body });
    return data as Account;
  },
);

export const reopenAccount = createDomainAction(
  { fallbackError: "Couldn't reopen the account. Try again." },
  async (id: string) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{id}/reopen', { params: { path: { id } } });
    return data as Account;
  },
);

export const deleteAccount = createDomainAction(
  { fallbackError: "Couldn't delete the account. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/accounts/{id}', { params: { path: { id } } });
  },
);

export const previewGmailCleanup = createDomainAction(
  { fallbackError: "Couldn't preview the Gmail cleanup. Try again." },
  async (accountId: string, before: string) => {
    const { data } = await serverApi.GET('/api/v1/accounts/{id}/gmail-cleanup-preview', {
      params: { path: { id: accountId }, query: { before } },
    });
    return data as GmailCleanupPreview;
  },
);

export const executeGmailCleanup = createDomainAction(
  { fallbackError: "Couldn't run the Gmail cleanup. Try again." },
  async (accountId: string, before: string) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{id}/gmail-cleanup', {
      params: { path: { id: accountId }, query: { before } },
    });
    return data as GmailCleanupResult;
  },
);

// Cardholders and cards

export const loadCardholders = createDomainAction(
  { fallbackError: "Couldn't load the cardholders. Try again." },
  async (accountId: string): Promise<Cardholder[]> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{accountId}/cardholders', { params: { path: { accountId } } });
    return (data as Cardholder[]) ?? [];
  },
);

export const addPrimaryCard = createDomainAction(
  { fallbackError: "Couldn't add the debit card. Try again." },
  async (accountId: string, body: CreateCardRequest) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/primary', {
      params: { path: { accountId } },
      body: body as Schemas['CreateCardRequest'],
    });
    return data as Cardholder;
  },
);

export const addAddonCardholder = createDomainAction(
  { fallbackError: "Couldn't add the cardholder. Try again." },
  async (accountId: string, body: CreateCardholderRequest) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders', {
      params: { path: { accountId } },
      body: body as Schemas['CreateCardholderRequest'],
    });
    return data as Cardholder;
  },
);

export const updateCardholder = createDomainAction(
  { fallbackError: "Couldn't update the cardholder. Try again." },
  async (accountId: string, cardholderId: string, body: UpdateCardholderRequest) => {
    const { data } = await serverApi.PUT('/api/v1/accounts/{accountId}/cardholders/{cardholderId}', {
      params: { path: { accountId, cardholderId } },
      body: body as Schemas['UpdateCardholderRequest'],
    });
    return data as Cardholder;
  },
);

export const closeCardholder = createDomainAction(
  { fallbackError: "Couldn't close the cardholder. Try again." },
  async (accountId: string, cardholderId: string, body?: CloseCardholderRequest) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/close', {
      params: { path: { accountId, cardholderId } },
      body,
    });
    return data as Cardholder;
  },
);

export const reopenCardholder = createDomainAction(
  { fallbackError: "Couldn't reopen the cardholder. Try again." },
  async (accountId: string, cardholderId: string) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/reopen', {
      params: { path: { accountId, cardholderId } },
    });
    return data as Cardholder;
  },
);

export const deleteCardholder = createDomainAction(
  { fallbackError: "Couldn't delete the cardholder. Try again." },
  async (accountId: string, cardholderId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/accounts/{accountId}/cardholders/{cardholderId}', {
      params: { path: { accountId, cardholderId } },
    });
  },
);

export const addCard = createDomainAction(
  { fallbackError: "Couldn't issue the card. Try again." },
  async (accountId: string, cardholderId: string, body: CreateCardRequest) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards', {
      params: { path: { accountId, cardholderId } },
      body: body as Schemas['CreateCardRequest'],
    });
    return data as Cardholder;
  },
);

export const replaceCard = createDomainAction(
  { fallbackError: "Couldn't replace the card. Try again." },
  async (accountId: string, cardholderId: string, cardId: string, body: ReplaceCardRequest) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/replace', {
      params: { path: { accountId, cardholderId, cardId } },
      body,
    });
    return data as Cardholder;
  },
);

export const closeCard = createDomainAction(
  { fallbackError: "Couldn't close the card. Try again." },
  async (accountId: string, cardholderId: string, cardId: string, body?: CloseCardRequest) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/close', {
      params: { path: { accountId, cardholderId, cardId } },
      body,
    });
    return data as Cardholder;
  },
);

/** DELETE of one card plastic (the server has a real per-card DELETE). */
export const deleteCardPlastic = createDomainAction(
  { fallbackError: "Couldn't delete the card. Try again." },
  async (accountId: string, cardholderId: string, cardId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}', {
      params: { path: { accountId, cardholderId, cardId } },
    });
  },
);

/** The cards dialog's "delete plastic": the closest real lifecycle step (closes the card). */
export const closeCardPlastic = createDomainAction(
  { fallbackError: "Couldn't close the card. Try again." },
  async (accountId: string, cardholderId: string, cardId: string) => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/close', {
      params: { path: { accountId, cardholderId, cardId } },
    });
    return data as Cardholder;
  },
);

export const reattributeTransactionsToCard = createDomainAction(
  { fallbackError: "Couldn't reassign transactions. Try again." },
  async (body: BulkReattributeCardRequest) => {
    const { data } = await serverApi.PATCH('/api/v1/transactions/card', {
      body: body as Schemas['BulkReattributeCardRequest'],
    });
    return data as BulkReattributeResponse;
  },
);

// Statements

export const loadAccountStatements = createDomainAction(
  { fallbackError: "Couldn't load statements. Try again." },
  async (accountId: string): Promise<StatementSummary[]> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{accountId}/statements', { params: { path: { accountId } } });
    return (data ?? []) as StatementSummary[];
  },
);

export const loadCardCycleSummary = createDomainAction(
  { fallbackError: "Couldn't load the card cycle summary. Try again." },
  async (accountId: string): Promise<CardCycleSummary | null> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{id}/card-summary', { params: { path: { id: accountId } } });
    return (data ?? null) as CardCycleSummary | null;
  },
);

export const loadStatementDetail = createDomainAction(
  { fallbackError: "Couldn't load statement details. Try again." },
  async (statementId: string): Promise<StatementDetail> => {
    const { data } = await serverApi.GET('/api/v1/statements/{statementId}', { params: { path: { statementId } } });
    return data as StatementDetail;
  },
);

export const loadStatementDeletionPreview = createDomainAction(
  { fallbackError: "Couldn't load the deletion preview. Try again." },
  async (accountId: string, statementId: string): Promise<StatementDeletionPreview> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{accountId}/statements/{statementId}/deletion-preview', {
      params: { path: { accountId, statementId } },
    });
    return data as StatementDeletionPreview;
  },
);

export const deleteStatement = createDomainAction(
  { fallbackError: "Couldn't delete the statement. Try again." },
  async (accountId: string, statementId: string): Promise<StatementDeletionResult> => {
    const { data } = await serverApi.DELETE('/api/v1/accounts/{accountId}/statements/{statementId}', {
      params: { path: { accountId, statementId } },
    });
    return data as StatementDeletionResult;
  },
);
