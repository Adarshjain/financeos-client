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

export interface ConfirmAllPair {
  seq: number;
  tx: Transaction;
  /** `EMI #14 due 5 Oct ₹36,603 ↔ 5 Oct ₹39,052 SBI Home Loan EMI (HDFC Savings)` */
  text: string;
}

export interface ConfirmAllPlan {
  /** Installments with exactly one candidate debit: these are what Confirm all links. */
  pairs: ConfirmAllPair[];
  /** Installments with several candidates: left for the user to pick by hand. */
  ambiguous: number;
}

/** What Confirm all will link: only installments with exactly one candidate (no guessing between several). */
export function confirmAllPlan(
  response: MatchSuggestionsResponse | null,
  accountNames: ReadonlyMap<string, string> = new Map(),
): ConfirmAllPlan {
  const pairs: ConfirmAllPair[] = [];
  let ambiguous = 0;
  for (const s of response?.suggestions ?? []) {
    if (s.candidates.length > 1) ambiguous += 1;
    if (s.candidates.length !== 1) continue;
    const tx = s.candidates[0];
    if (tx.amount == null) continue;
    const account = accountNames.get(tx.accountId);
    pairs.push({
      seq: s.installmentSeq,
      tx,
      text: `EMI #${s.installmentSeq} due ${formatDate(s.dueDate, 'list')} ${formatMoney(s.expectedAmount, { decimals: 'auto' })} ↔ ${formatDate(tx.date, 'list')} ${formatMoney(Math.abs(tx.amount), { decimals: 'auto' })} ${tx.description || 'DEBIT'}${account ? ` (${account})` : ''}`,
    });
  }
  return { pairs, ambiguous };
}

/** "2 EMIs have more than one possible payment; pick those by hand." */
export function ambiguousNote(count: number): string {
  return `${count === 1 ? '1 EMI has' : `${count} EMIs have`} more than one possible payment; pick ${count === 1 ? 'it' : 'those'} by hand.`;
}
