import { unwrapAction } from '@/lib/actionResult';
import type { BatchLoanPaymentItem, BatchLoanPaymentRequest } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';

import { addLoanPaymentsBatch } from './loanActions';

/** The payment that marks an installment paid by a bank debit: that day, that amount, that transaction. */
/** Null when the debit has no rupee amount yet, so there is nothing to record. */
export function paymentItemFor(installmentSeq: number, tx: Transaction): BatchLoanPaymentItem | null {
  if (tx.amount == null) return null;
  return {
    installmentSeq,
    paymentDate: tx.date,
    amount: Math.abs(tx.amount),
    transactionId: tx.id,
  };
}

/** POST /loans/{id}/payments/batch (through the server action): records several installments in one call. */
export function postLoanPaymentsBatch(loanId: string, body: BatchLoanPaymentRequest): Promise<{ created: number }> {
  return unwrapAction(addLoanPaymentsBatch(loanId, body));
}
