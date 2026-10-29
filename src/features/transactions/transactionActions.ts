'use server';

import { serverApi } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import type { CategorizeResponse } from '@/lib/categories.types';
import { createDomainAction } from '@/lib/domainApi';
import type { FilterClause } from '@/lib/reports.types';
import type {
  BatchReviewRequest,
  MergeTransactionsResponse,
  Transaction,
  TransactionRequest,
} from '@/lib/transaction.types';


/** One page of the transaction picker's search. A failed page is the caller's to treat as empty. */
export const searchPickerTransactions = createDomainAction(
  { fallbackError: "Couldn't search the transactions. Try again." },
  async (
    filters: FilterClause[],
    search: string | null,
    page: number,
    size: number,
  ): Promise<Schemas['PageTransactionResponse'] | null> => {
    const { data } = await serverApi.POST('/api/v1/transactions/search', {
      body: { filters, search },
      params: { query: { page, size } },
    });
    return data ?? null;
  },
);

export const createTransaction = createDomainAction(
  { fallbackError: "Couldn't save the transaction. Try again." },
  async (body: TransactionRequest): Promise<Transaction> => {
    const { data } = await serverApi.POST('/api/v1/transactions', { body: body as Schemas['CreateTransactionRequest'] });
    return data! as Transaction;
  },
);

export const updateTransaction = createDomainAction(
  { fallbackError: "Couldn't save the transaction. Try again." },
  async (id: string, body: TransactionRequest): Promise<Transaction> => {
    const { data } = await serverApi.PUT('/api/v1/transactions/{id}', {
      params: { path: { id } },
      body: body as Schemas['UpdateTransactionRequest'],
    });
    return data! as Transaction;
  },
);

/** Category and MCC suggestions for a description. */
export const categorizeDescription = createDomainAction(
  { fallbackError: "Couldn't suggest categories." },
  async (description: string): Promise<CategorizeResponse | null> => {
    const { data } = await serverApi.POST('/api/v1/categorize', { body: { description } });
    return (data ?? null) as CategorizeResponse | null;
  },
);

export const batchDeleteTransactions = createDomainAction(
  { fallbackError: "Couldn't delete the transactions. Try again." },
  async (transactionIds: string[]): Promise<Schemas['BatchDeleteResponse']> => {
    const { data } = await serverApi.POST('/api/v1/transactions/batch-delete', { body: { transactionIds } });
    if (!data) throw new Error('No response from the server');
    return data;
  },
);

export const mergeTransactions = createDomainAction(
  { fallbackError: "Couldn't merge these transactions. Try again." },
  async (keepId: string, deleteId: string): Promise<MergeTransactionsResponse> => {
    const { data } = await serverApi.POST('/api/v1/transactions/merge', { body: { keepId, deleteId } });
    if (!data) throw new Error('No response from the server');
    return data as MergeTransactionsResponse;
  },
);

export const batchReviewTransactions = createDomainAction(
  { fallbackError: "Couldn't update the review state. Try again." },
  async (body: BatchReviewRequest): Promise<Schemas['BatchReviewResponse']> => {
    const { data } = await serverApi.POST('/api/v1/transactions/batch-review', { body: body as Schemas['BatchReviewRequest'] });
    if (!data) throw new Error('No response from the server');
    return data;
  },
);

/** Sends back what an approve cleared (rows and the rules it verified) in one all-or-nothing request. */
export const undoApproveTransactions = createDomainAction(
  { fallbackError: "Couldn't undo. Try again." },
  async (body: Schemas['UndoApproveRequest']): Promise<void> => {
    const { data } = await serverApi.POST('/api/v1/transactions/undo-approve', { body });
    if (!data) throw new Error("Couldn't undo. Try again.");
  },
);
