import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import type { BatchLoanPaymentItem, BatchLoanPaymentRequest } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';

/** The payment that marks an installment paid by a bank debit: that day, that amount, that transaction. */
export function paymentItemFor(installmentSeq: number, tx: Transaction): BatchLoanPaymentItem {
  return {
    installmentSeq,
    paymentDate: tx.date,
    amount: Math.abs(tx.amount),
    transactionId: tx.id,
  };
}

/** POST /loans/{id}/payments/batch: records several installments in one call. */
export function postLoanPaymentsBatch(loanId: string, body: BatchLoanPaymentRequest): Promise<{ created: number }> {
  return api
    .POST('/api/v1/loans/{id}/payments/batch', {
      params: { path: { id: loanId } },
      // The generated request type requires `transactionId` on every item; the match-confirmation
      // flow always supplies one, but the hand-authored item type marks it optional like the
      // single-payment request.
      body: body as Schemas['BatchLoanPaymentRequest'],
    })
    .then(() => ({ created: body.items.length }));
}
