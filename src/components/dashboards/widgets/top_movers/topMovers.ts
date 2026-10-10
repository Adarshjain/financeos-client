// Pure selection behind the top_movers widget: the open holdings that moved
// most since their previous evening price, split into gainers and losers.

import type { Position } from '@/lib/types';

import { num } from '../investmentsLoansKit/kit';

export interface Mover {
  holdingId: string;
  name: string;
  /** Latest price per unit. */
  price: number | null;
  /** Whole-holding change in ₹. */
  change: number;
  changePct: number;
  /** The move runs from this close… */
  previousCloseAsOf: string | null;
  /** …to this price date. */
  lastPriceAsOf: string | null;
}

export interface Movers {
  gainers: Mover[];
  losers: Mover[];
  /**
   * The previous-close date every listed mover moved from ("since dd/mm"), when
   * they all share one window (previous close → latest price); null otherwise.
   */
  since: string | null;
  /**
   * The listed movers' windows differ (e.g. fund NAVs a day behind stocks): the
   * footer says "since last update" and each row shows its own dates.
   */
  mixed: boolean;
}

function toMover(p: Position): Mover | null {
  const pct = num(p.dayChangePct);
  const change = num(p.dayChange);
  if (pct == null || change == null) return null;
  // Closed holdings have nothing left to move.
  if ((num(p.quantity) ?? 0) <= 0) return null;
  return {
    holdingId: p.holdingId,
    name: p.instrument.name,
    price: num(p.lastPrice),
    change,
    changePct: pct,
    previousCloseAsOf: p.previousCloseAsOf ?? null,
    lastPriceAsOf: p.lastPriceAsOf ?? null,
  };
}

/**
 * The `n` biggest gainers and `n` biggest losers by % change (unmoved holdings
 * are in neither), and whether they share one previous-close → price window.
 */
export function topMovers(positions: readonly Position[], n: number): Movers {
  const movers = positions.map(toMover).filter((m): m is Mover => m != null);
  const gainers = movers.filter((m) => m.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, n);
  const losers = movers.filter((m) => m.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, n);
  const windows = new Set([...gainers, ...losers].map((m) => `${m.previousCloseAsOf ?? ''}>${m.lastPriceAsOf ?? ''}`));
  const mixed = windows.size > 1;
  const first = gainers[0] ?? losers[0];
  const since = !mixed && first ? first.previousCloseAsOf : null;
  return { gainers, losers, since, mixed };
}

/** The widget's `n` param, clamped to the server's bounds (3–10, default 5). */
export function moversCount(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return 5;
  return Math.min(10, Math.max(3, raw));
}
