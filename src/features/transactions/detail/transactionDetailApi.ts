import { unwrapAction } from '@/lib/actionResult';
import type {
  CreateTransactionLinkRequest,
  Transaction,
  TransactionLinkResponse,
} from '@/lib/transaction.types';

import {
  addTransactionLink,
  attachDividendTransaction,
  attachEpfWithdrawalTransaction,
  detachDividendTransaction,
  detachEpfWithdrawalTransaction,
  loadTransaction,
  loadTransactionLinks,
  removeLoanPayment,
  removeTransaction,
  removeTransactionLink,
} from './detailActions';

/*
 * The transaction detail's reads and writes, as plain promise functions over the server actions: a failure
 * throws an ActionError carrying the server's message. Callers (also Legacy's) keep these names and signatures.
 */

/** One transaction, for the detail of a transaction that is not on the open page. */
export const fetchTransaction = (id: string): Promise<Transaction> => unwrapAction(loadTransaction(id));

export const deleteTransaction = (id: string): Promise<void> => unwrapAction(removeTransaction(id));

/** Every link this transaction is in. */
export const fetchTransactionLinks = (transactionId: string): Promise<TransactionLinkResponse[]> =>
  unwrapAction(loadTransactionLinks(transactionId));

export const createTransactionLink = (body: CreateTransactionLinkRequest): Promise<TransactionLinkResponse> =>
  unwrapAction(addTransactionLink(body));

export const deleteTransactionLink = (linkId: string): Promise<void> => unwrapAction(removeTransactionLink(linkId));

/** Removes the settlement, so the installment is unpaid again. */
export const deleteLoanPayment = (loanId: string, paymentId: string): Promise<void> =>
  unwrapAction(removeLoanPayment(loanId, paymentId));

/** Detaches the credit from the dividend (idempotent). */
export const unlinkDividendTransaction = (dividendId: string): Promise<void> => unwrapAction(detachDividendTransaction(dividendId));

/** Attaches a credit to the dividend. */
export const linkDividendTransaction = (dividendId: string, transactionId: string, updateTds = false): Promise<void> =>
  unwrapAction(attachDividendTransaction(dividendId, transactionId, updateTds));

/** Detaches the credit from the EPF withdrawal. */
export const unlinkEpfWithdrawalTransaction = (entryId: string): Promise<void> =>
  unwrapAction(detachEpfWithdrawalTransaction(entryId));

/** Attaches a credit to the EPF withdrawal (TDS is not recorded again). */
export const linkEpfWithdrawalTransaction = (entryId: string, transactionId: string): Promise<void> =>
  unwrapAction(attachEpfWithdrawalTransaction(entryId, transactionId));
