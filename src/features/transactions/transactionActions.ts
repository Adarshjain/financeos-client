'use server';

import { serverApi } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';
import type { FilterClause } from '@/lib/reports.types';
import type {
  BatchReviewRequest,
  CategorizeResponse,
  MergeTransactionsResponse,
  SetCategoryRequest,
  SetCategoryResponse,
  Transaction,
  TransactionRequest,
} from '@/lib/transaction.types';


/** One page of the transaction picker's search. A failed page is the caller's to treat as empty. */
export const searchPickerTransactions = action('transaction.searchPickerTransactions', createDomainAction(
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
));

export const createTransaction = action('transaction.createTransaction', createDomainAction(
  { fallbackError: "Couldn't save the transaction. Try again." },
  async (body: TransactionRequest): Promise<Transaction> => {
    const { data } = await serverApi.POST('/api/v1/transactions', { body: body as Schemas['CreateTransactionRequest'] });
    return data! as Transaction;
  },
));

export const updateTransaction = action('transaction.updateTransaction', createDomainAction(
  { fallbackError: "Couldn't save the transaction. Try again." },
  async (id: string, body: TransactionRequest): Promise<Transaction> => {
    const { data } = await serverApi.PUT('/api/v1/transactions/{id}', {
      params: { path: { id } },
      body: body as Schemas['UpdateTransactionRequest'],
    });
    return data! as Transaction;
  },
));

/** Set (or clear) a transaction's category; `restore` puts back what the response's `previous` reported (Undo). */
export const setTransactionCategory = action('transaction.setTransactionCategory', createDomainAction(
  { fallbackError: "Couldn't set the category. Try again." },
  async (id: string, body: SetCategoryRequest): Promise<SetCategoryResponse> => {
    const { data } = await serverApi.PUT('/api/v1/transactions/{id}/category', { params: { path: { id } }, body });
    return data! as unknown as SetCategoryResponse;
  },
));

/** A category suggestion for a description. */
export const categorizeDescription = action('transaction.categorizeDescription', createDomainAction(
  { fallbackError: "Couldn't suggest a category. Try again." },
  async (description: string): Promise<CategorizeResponse | null> => {
    const { data } = await serverApi.POST('/api/v1/categorize', { body: { description } });
    return (data ?? null) as CategorizeResponse | null;
  },
));

export const batchDeleteTransactions = action('transaction.batchDeleteTransactions', createDomainAction(
  { fallbackError: "Couldn't delete the transactions. Try again." },
  async (transactionIds: string[]): Promise<Schemas['BatchDeleteResponse']> => {
    const { data } = await serverApi.POST('/api/v1/transactions/batch-delete', { body: { transactionIds } });
    if (!data) throw new Error('No response from the server');
    return data;
  },
));

export const mergeTransactions = action('transaction.mergeTransactions', createDomainAction(
  { fallbackError: "Couldn't merge these transactions. Try again." },
  async (keepId: string, deleteId: string): Promise<MergeTransactionsResponse> => {
    const { data } = await serverApi.POST('/api/v1/transactions/merge', { body: { keepId, deleteId } });
    if (!data) throw new Error('No response from the server');
    return data as MergeTransactionsResponse;
  },
));

export const batchReviewTransactions = action('transaction.batchReviewTransactions', createDomainAction(
  { fallbackError: "Couldn't update the review state. Try again." },
  async (body: BatchReviewRequest): Promise<Schemas['BatchReviewResponse']> => {
    const { data } = await serverApi.POST('/api/v1/transactions/batch-review', { body: body as Schemas['BatchReviewRequest'] });
    if (!data) throw new Error('No response from the server');
    return data;
  },
));

/** Sends back what an approve cleared in one all-or-nothing request. */
export const undoApproveTransactions = action('transaction.undoApproveTransactions', createDomainAction(
  { fallbackError: "Couldn't undo. Try again." },
  async (body: Schemas['UndoApproveRequest']): Promise<void> => {
    const { data } = await serverApi.POST('/api/v1/transactions/undo-approve', { body });
    if (!data) throw new Error("Couldn't undo. Try again.");
  },
));

/** One page of the flagged-duplicate pairs of the given transactions: each transaction with the one it looks like (twin null when none is found). */
export const loadDuplicateReview = action('transaction.loadDuplicateReview', createDomainAction(
  { fallbackError: "Couldn't load the possible duplicates. Try again." },
  async (ids: string[], page: number, size: number): Promise<Schemas['PageDuplicateReviewItem']> => {
    const { data } = await serverApi.GET('/api/v1/transactions/review/duplicates', { params: { query: { ids, page, size } } });
    if (!data) throw new Error('No response from the server');
    return data;
  },
));
