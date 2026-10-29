'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type { CreateLendingRequest, UpdateCounterpartyRequest, UpdateLendingRequest } from '@/lib/types';

/** POST /lendings: records one ledger entry. */
export const createLendingEntry = createDomainAction(
  { fallbackError: "Couldn't record lending. Try again." },
  async (body: CreateLendingRequest) => {
    const { data } = await serverApi.POST('/api/v1/lendings', { body });
    return data!;
  },
);

/** PUT /lendings/{id}: edits an entry. */
export const updateLendingEntry = createDomainAction(
  { fallbackError: "Couldn't update lending. Try again." },
  async (id: string, body: UpdateLendingRequest) => {
    const { data } = await serverApi.PUT('/api/v1/lendings/{id}', { params: { path: { id } }, body });
    return data!;
  },
);

/** DELETE /lendings/{id}: removes an entry. */
export const deleteLendingEntry = createDomainAction(
  { fallbackError: "Couldn't delete lending. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/lendings/{id}', { params: { path: { id } } });
  },
);

/** PUT /lendings/{id}/transaction: attaches (or replaces) the bank transaction behind an entry. */
export const linkLendingEntryTransaction = createDomainAction(
  { fallbackError: "Couldn't link transaction. Try again." },
  async (id: string, transactionId: string) => {
    const { data } = await serverApi.PUT('/api/v1/lendings/{id}/transaction', {
      params: { path: { id } },
      body: { transactionId },
    });
    return data!;
  },
);

/** DELETE /lendings/{id}/transaction: detaches it again (idempotent). */
export const unlinkLendingEntryTransaction = createDomainAction(
  { fallbackError: "Couldn't unlink transaction. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/lendings/{id}/transaction', { params: { path: { id } } });
  },
);

/** POST /counterparties/{id}/settlements: records a bank transfer as a settlement entry. */
export const recordCounterpartySettlement = createDomainAction(
  { fallbackError: "Couldn't record settlement. Try again." },
  async (counterpartyId: string, transactionId: string) => {
    const { data } = await serverApi.POST('/api/v1/counterparties/{id}/settlements', {
      params: { path: { id: counterpartyId } },
      body: { transactionId },
    });
    return data!;
  },
);

/** PUT /counterparties/{id}: edits a person. */
export const updateCounterparty = createDomainAction(
  { fallbackError: "Couldn't update counterparty. Try again." },
  async (id: string, body: UpdateCounterpartyRequest) => {
    const { data } = await serverApi.PUT('/api/v1/counterparties/{id}', { params: { path: { id } }, body });
    return data!;
  },
);

/** DELETE /counterparties/{id}: removes a person. */
export const deleteCounterparty = createDomainAction(
  { fallbackError: "Couldn't delete counterparty. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/counterparties/{id}', { params: { path: { id } } });
  },
);
