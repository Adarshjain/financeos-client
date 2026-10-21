import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { plainAmount } from '@/features/loans/loanFormat';
import type { MatchSuggestionsResponse } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';

export interface SuggestionRow {
  key: string;
  seq: number;
  tx: Transaction;
  /** `#14 "SBI Home Loan EMI" 5 Oct · ₹39,052` */
  text: string;
}

/** One row per suggested debit, installments in order. */
export function suggestionRows(response: MatchSuggestionsResponse | null): SuggestionRow[] {
  if (!response) return [];
  return response.suggestions
    .filter((s) => s.candidates.length > 0)
    .flatMap((s) =>
      s.candidates.map((tx) => ({
        key: `${s.installmentSeq}:${tx.id}`,
        seq: s.installmentSeq,
        tx,
        text: `#${s.installmentSeq} "${tx.description || 'DEBIT'}" ${formatDayMonth(tx.date)} · ₹${plainAmount(Math.abs(tx.amount))}`,
      })),
    );
}

/** True when the server was asked and found no debit for any due or overdue EMI. */
export function nothingFound(response: MatchSuggestionsResponse | null): boolean {
  return response != null && response.suggestions.every((s) => s.candidates.length === 0);
}
