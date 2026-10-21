import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { plainAmount } from '@/features/loans/loanFormat';
import type { InstallmentDto, InstallmentMatchSuggestion } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';

export type PayChoice = 'found' | 'none' | 'pick';

/** What the Mark paid form does with the transaction side of the payment. */
export const PAY_CHOICE_COPY: Record<PayChoice, { label: string; description: string }> = {
  found: { label: 'Link the bank debit we found', description: '' },
  none: { label: 'Record payment without a transaction', description: 'Amount and date below' },
  pick: { label: 'Pick another bank debit', description: 'Search your debits' },
};

/** "₹2,449 more than EMI" or "₹1,000 less than EMI"; null when what was paid is the EMI. */
export function differenceWords(paid: number, emi: number): string | null {
  if (!Number.isFinite(paid) || paid <= 0) return null;
  const diff = Math.round((paid - emi) * 100) / 100;
  if (diff === 0) return null;
  return `₹${plainAmount(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than EMI`;
}

/** The bank debit the server found for one installment: the first (closest) candidate. */
export function foundDebit(
  suggestions: InstallmentMatchSuggestion[] | undefined,
  seq: number,
): Transaction | null {
  const match = suggestions?.find((s) => s.installmentSeq === seq);
  return match?.candidates[0] ?? null;
}

/** `"SBI Home Loan EMI" · HDFC Bank Savings · 5 Oct · ₹39,052` */
export function foundDebitLine(tx: Transaction, accountName: string): string {
  const text = tx.description || tx.sourcedDescription || 'Bank debit';
  return `"${text}" · ${accountName} · ${formatDayMonth(tx.date)} · ₹${plainAmount(Math.abs(tx.amount))}`;
}

export interface PayValues {
  choice: PayChoice;
  amount: string;
  date: string;
  /** The debit behind the choice, when there is one. */
  transactionId?: string;
}

export type PayField = 'amount' | 'date' | 'transaction';

export interface PayProblem {
  field: PayField;
  message: string;
}

/** What stops the form from saving: a date, an amount above zero, and a debit when one was asked for. */
export function payProblems(v: PayValues): PayProblem[] {
  const problems: PayProblem[] = [];
  if (!v.amount || !Number.isFinite(Number(v.amount)) || Number(v.amount) <= 0) {
    problems.push({ field: 'amount', message: 'Enter the amount you paid' });
  }
  if (!v.date) problems.push({ field: 'date', message: 'Enter the date you paid' });
  if (v.choice !== 'none' && !v.transactionId) {
    problems.push({ field: 'transaction', message: 'Pick the bank debit, or record without a transaction' });
  }
  return problems;
}

/** The subtitle under the form title: `₹36,603 due 5 Oct · Home Loan · SBI MaxGain`. */
export function payDescription(inst: InstallmentDto, loanName: string): string {
  return `₹${plainAmount(inst.emi)} due ${formatDayMonth(inst.dueDate)} · ${loanName}`;
}
