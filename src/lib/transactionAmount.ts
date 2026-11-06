import { formatMoney } from '@/lib/format';

interface AmountFields {
  amount?: number | null;
  originalAmount?: number | null;
  originalCurrency?: string | null;
}

/** "USD 20.00": the original amount of a foreign charge, code then two decimals; null when it has none. */
export function foreignAmountText(t: AmountFields): string | null {
  if (t.originalAmount == null || !t.originalCurrency) return null;
  return `${t.originalCurrency} ${formatMoney(Math.abs(t.originalAmount), { decimals: 'exact', symbol: false })}`;
}

/** The detail line "USD 20.00 · charged ₹1,712.40", only when both the original and the rupee amount are known. */
export function foreignChargedText(t: AmountFields): string | null {
  const original = foreignAmountText(t);
  if (!original || t.amount == null) return null;
  return `${original} · charged ${formatMoney(Math.abs(t.amount), { decimals: 'exact' })}`;
}

/**
 * How a row shows its amount: direction plus text without the rupee symbol. A foreign charge still waiting for its
 * statement has no rupee amount, so it shows "USD 20.00" (direction from the original's sign). Null when neither is known.
 */
export function rowAmount(t: AmountFields): { credit: boolean; text: string } | null {
  if (t.amount != null) {
    return { credit: t.amount > 0, text: formatMoney(Math.abs(t.amount), { decimals: 'exact', symbol: false }) };
  }
  const text = foreignAmountText(t);
  return text ? { credit: (t.originalAmount ?? 0) > 0, text } : null;
}

/** The sum of the rupee amounts that are known; a null amount is skipped, never counted as 0. */
export function sumAmounts(items: readonly AmountFields[], pick: (a: number) => number = (a) => a): number {
  let total = 0;
  for (const t of items) if (t.amount != null) total += pick(t.amount);
  return total;
}

/** The size of an amount, or null when there is none (never 0). */
export function absAmount(value: number | null | undefined): number | null {
  return value == null ? null : Math.abs(value);
}

/** The size of an amount as a plain string for a form field; empty when there is none. */
export function absAmountText(value: number | null | undefined): string {
  return value == null ? '' : String(Math.abs(value));
}

/** The signed amount that tells the direction: the rupee amount, else the foreign original (signed the same way); null when neither is known. */
export function directionAmount(t: AmountFields): number | null {
  return t.amount ?? t.originalAmount ?? null;
}
