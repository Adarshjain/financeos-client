import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import type {
  CreateTransactionLinkRequest,
  Transaction,
  TransactionLinkResponse,
} from '@/lib/transaction.types';

/** GET /transactions/{id}: one transaction, for the detail of a transaction that is not on the open page. */
export async function fetchTransaction(id: string): Promise<Transaction> {
  const { data } = await api.GET('/api/v1/transactions/{id}', { params: { path: { id } } });
  return data as unknown as Transaction;
}

/** DELETE /transactions/{id}. */
export function deleteTransaction(id: string) {
  return api.DELETE('/api/v1/transactions/{id}', { params: { path: { id } } });
}

/** GET /transaction-links?transactionId=: every link this transaction is in. */
export async function fetchTransactionLinks(transactionId: string): Promise<TransactionLinkResponse[]> {
  const { data } = await api.GET('/api/v1/transaction-links', { params: { query: { transactionId } } });
  return (data ?? []) as TransactionLinkResponse[];
}

/** POST /transaction-links. */
export async function createTransactionLink(body: CreateTransactionLinkRequest): Promise<TransactionLinkResponse> {
  const { data } = await api.POST('/api/v1/transaction-links', { body: body as Schemas['CreateTransactionLinkRequest'] });
  return data as unknown as TransactionLinkResponse;
}

/** DELETE /transaction-links/{id}. */
export function deleteTransactionLink(linkId: string) {
  return api.DELETE('/api/v1/transaction-links/{id}', { params: { path: { id: linkId } } });
}

/** DELETE /loans/{id}/payments/{paymentId}: removes the settlement, so the installment is unpaid again. */
export function deleteLoanPayment(loanId: string, paymentId: string) {
  return api.DELETE('/api/v1/loans/{id}/payments/{paymentId}', { params: { path: { id: loanId, paymentId } } });
}

/** DELETE /investments/dividends/{id}/transaction: detaches the credit from the dividend (idempotent). */
export function unlinkDividendTransaction(dividendId: string) {
  return api.DELETE('/api/v1/investments/dividends/{id}/transaction', { params: { path: { id: dividendId } } });
}

/** PUT /investments/dividends/{id}/transaction: attaches a credit to the dividend. */
export function linkDividendTransaction(dividendId: string, transactionId: string, updateTds = false) {
  return api.PUT('/api/v1/investments/dividends/{id}/transaction', {
    params: { path: { id: dividendId } },
    body: { transactionId, updateTds },
  });
}

/** DELETE /epf/entries/{id}/transaction: detaches the credit from the EPF withdrawal. */
export function unlinkEpfWithdrawalTransaction(entryId: string) {
  return api.DELETE('/api/v1/epf/entries/{id}/transaction', { params: { path: { id: entryId } } });
}

/** PUT /epf/entries/{id}/transaction: attaches a credit to the EPF withdrawal (TDS is not recorded again). */
export function linkEpfWithdrawalTransaction(entryId: string, transactionId: string) {
  return api.PUT('/api/v1/epf/entries/{id}/transaction', {
    params: { path: { id: entryId } },
    body: { transactionId, recordTds: false },
  });
}
