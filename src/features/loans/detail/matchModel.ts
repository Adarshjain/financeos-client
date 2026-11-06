import { formatDate, formatMoney } from '@/lib/format';
import type { MatchSuggestionsResponse } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';

export interface SuggestionRow {
  key: string;
  seq: number;
  tx: Transaction;
  /** The debit's size in rupees. */
  amount: number;
  /** `#14 "SBI Home Loan EMI" 5 Oct · ₹39,052` */
  text: string;
}

/** One row per suggested debit, installments in order. */
export function suggestionRows(response: MatchSuggestionsResponse | null): SuggestionRow[] {
  if (!response) return [];
  return response.suggestions
    .filter((s) => s.candidates.length > 0)
    .flatMap((s) =>
      // A debit with no rupee amount yet cannot be recorded as a payment, so it is not suggested.
      s.candidates.flatMap((tx) =>
        tx.amount == null
          ? []
          : [
              {
                key: `${s.installmentSeq}:${tx.id}`,
                seq: s.installmentSeq,
                tx,
                amount: Math.abs(tx.amount),
                text: `#${s.installmentSeq} "${tx.description || 'DEBIT'}" ${formatDate(tx.date, 'list')} · ${formatMoney(Math.abs(tx.amount), { decimals: 'auto' })}`,
              },
            ],
      ),
    );
}

/** True when the server was asked and found no debit for any due or overdue EMI. */
export function nothingFound(response: MatchSuggestionsResponse | null): boolean {
  return response != null && response.suggestions.every((s) => s.candidates.length === 0);
}
