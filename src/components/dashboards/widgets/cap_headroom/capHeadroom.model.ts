// The cap_list view's rows (current windows, most used first, from the server)
// and the tone of each: under 80% neutral, 80–99% amber, 100%+ rose ("Cap hit").

import type { TableData, TableRow } from '@/lib/reports.types';

import { cellNumber, cellText } from '../cards_spending_kit/kit';

export type CapTone = 'neutral' | 'near' | 'hit';

/** Lower bound (inclusive) of the "nearly used" band. */
export const CAP_NEAR_PCT = 80;

export function capTone(pct: number | null): CapTone {
  if (pct == null) return 'neutral';
  if (pct >= 100) return 'hit';
  return pct >= CAP_NEAR_PCT ? 'near' : 'neutral';
}

export interface CapItem {
  id: string;
  cardId: string;
  card: string;
  cap: string;
  /** Cardholder label; null for the whole card ("All cardholders"). */
  cardholder: string | null;
  /** RUPEES or POINTS. */
  unit: string;
  used: number;
  limit: number;
  pct: number | null;
  windowEnd: string;
  tone: CapTone;
}

const ALL_CARDHOLDERS = 'All cardholders';

function item(row: TableRow): CapItem {
  const used = cellNumber(row, 'used') ?? 0;
  const limit = cellNumber(row, 'capLimit') ?? 0;
  const pct = cellNumber(row, 'utilizationPct') ?? (limit > 0 ? (used / limit) * 100 : null);
  const cardholder = cellText(row, 'cardholder');
  return {
    id: cellText(row, 'id'),
    cardId: cellText(row, 'cardId'),
    card: cellText(row, 'card'),
    cap: cellText(row, 'cap'),
    cardholder: cardholder && cardholder !== ALL_CARDHOLDERS ? cardholder : null,
    unit: cellText(row, 'unit') || 'RUPEES',
    used,
    limit,
    pct,
    windowEnd: cellText(row, 'windowEnd'),
    tone: capTone(pct),
  };
}

/** Every cap row, most used first (re-sorted so a page always reads in that order). */
export function capItems(data: TableData): CapItem[] {
  return data.rows.map(item).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
}
