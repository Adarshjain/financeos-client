'use server';

import { serverApi } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type {
  CreateTransactionLinkRequest,
  Transaction,
  TransactionLinkResponse,
} from '@/lib/transaction.types';

/** One transaction, for the detail of a transaction that is not on the open page. */
export const loadTransaction = createDomainAction(
  { fallbackError: "Couldn't load the transaction. Try again." },
  async (id: string): Promise<Transaction> => {
    const { data } = await serverApi.GET('/api/v1/transactions/{id}', { params: { path: { id } } });
    return data as unknown as Transaction;
  },
);

export const removeTransaction = createDomainAction(
  { fallbackError: "Couldn't delete the transaction. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/transactions/{id}', { params: { path: { id } } });
  },
);

/** Every link a transaction is in. */
export const loadTransactionLinks = createDomainAction(
  { fallbackError: "Couldn't load the links. Try again." },
  async (transactionId: string): Promise<TransactionLinkResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/transaction-links', { params: { query: { transactionId } } });
    return (data ?? []) as TransactionLinkResponse[];
  },
);

export const addTransactionLink = createDomainAction(
  { fallbackError: "Couldn't link the transactions. Try again." },
  async (body: CreateTransactionLinkRequest): Promise<TransactionLinkResponse> => {
    const { data } = await serverApi.POST('/api/v1/transaction-links', { body: body as Schemas['CreateTransactionLinkRequest'] });
    return data as unknown as TransactionLinkResponse;
  },
);

export const removeTransactionLink = createDomainAction(
  { fallbackError: "Couldn't unlink the transaction. Try again." },
  async (linkId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/transaction-links/{id}', { params: { path: { id: linkId } } });
  },
);

/** Removes the settlement, so the installment is unpaid again. */
export const removeLoanPayment = createDomainAction(
  { fallbackError: "Couldn't delete the payment. Try again." },
  async (loanId: string, paymentId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/loans/{id}/payments/{paymentId}', { params: { path: { id: loanId, paymentId } } });
  },
);

/** Detaches the credit from the dividend (idempotent). */
export const detachDividendTransaction = createDomainAction(
  { fallbackError: "Couldn't unlink the dividend. Try again." },
  async (dividendId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/investments/dividends/{id}/transaction', { params: { path: { id: dividendId } } });
  },
);

export const attachDividendTransaction = createDomainAction(
  { fallbackError: "Couldn't link the dividend. Try again." },
  async (dividendId: string, transactionId: string, updateTds: boolean): Promise<void> => {
    await serverApi.PUT('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: dividendId } },
      body: { transactionId, updateTds },
    });
  },
);

/** Detaches the credit from the EPF withdrawal. */
export const detachEpfWithdrawalTransaction = createDomainAction(
  { fallbackError: "Couldn't unlink the EPF withdrawal. Try again." },
  async (entryId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/epf/entries/{id}/transaction', { params: { path: { id: entryId } } });
  },
);

/** Attaches a credit to the EPF withdrawal (TDS is not recorded again). */
export const attachEpfWithdrawalTransaction = createDomainAction(
  { fallbackError: "Couldn't link the EPF withdrawal. Try again." },
  async (entryId: string, transactionId: string): Promise<void> => {
    await serverApi.PUT('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: entryId } },
      body: { transactionId, recordTds: false },
    });
  },
);
