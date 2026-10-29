import { unwrapAction } from '@/lib/actionResult';
import type { BatchLoanPaymentItem, BatchLoanPaymentRequest } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';

import { addLoanPaymentsBatch } from './loanActions';

/** The payment that marks an installment paid by a bank debit: that day, that amount, that transaction. */
export function paymentItemFor(installmentSeq: number, tx: Transaction): BatchLoanPaymentItem {
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
