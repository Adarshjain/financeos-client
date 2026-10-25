// The portfolio card's top holdings: the open holdings with the most current value, as the board draws them
// (symbol, quantity, day move).

import type { Position } from '@/lib/types';

import { num } from '../investmentsLoansData';

/** How many holdings the portfolio card lists. */
export const TOP_HOLDINGS = 3;

export interface TopHolding {
  holdingId: string;
  /** The instrument's id: a holding's own page is keyed by it. */
  instrumentId: string;
  /** The symbol, or the name for a fund that has none. */
  label: string;
  quantity: number;
  /** Move since the previous evening price (%); null without two prices. */
  dayChangePct: number | null;
}

/** The `n` open holdings with the largest current value, largest first. */
export function topHoldings(positions: readonly Position[], n: number = TOP_HOLDINGS): TopHolding[] {
  return positions
    .map((p) => ({ p, value: num(p.currentValue), qty: num(p.quantity) }))
    .filter((x): x is { p: Position; value: number; qty: number } => x.value != null && x.value > 0 && x.qty != null && x.qty > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
    .map(({ p, qty }) => ({
      holdingId: p.holdingId,
      instrumentId: p.instrument.id,
      label: p.instrument.symbol || p.instrument.name,
      quantity: qty,
      dayChangePct: num(p.dayChangePct),
    }));
}
