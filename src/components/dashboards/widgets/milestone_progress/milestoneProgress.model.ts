// The progress_list view's rows: the nearest unachieved milestone per card (the
// server sends current windows, not achieved, most progressed first), with the
// days left in its window and the daily pace still needed to reach it.

import type { TableData, TableRow } from '@/lib/reports.types';

import { cellNumber, cellText, daysBetween } from '../cards_spending_kit/kit';

export interface MilestoneItem {
  /** The row id (milestone + window). */
  id: string;
  cardId: string;
  card: string;
  milestone: string;
  threshold: number;
  progress: number;
  /** Progress ÷ threshold in percent, 0–100+. */
  pct: number;
  /** Days left in the window including today; 0 once it has ended. */
  daysLeft: number;
  /** What is still needed per day to hit the threshold; null when achieved or no days left. */
  perDay: number | null;
  /** Counts transactions instead of rupees (basis TXN_COUNT, when the server sends it). */
  countsTransactions: boolean;
  /** Stored reward type (CASH / POINTS) and its display label. */
  rewardType: string | null;
  rewardTypeLabel: string | null;
  /** The payout in its own unit, when the server sends it. */
  payoutValue: number | null;
}

function item(row: TableRow, today: string, rewardLabels: Record<string, string> | null | undefined): MilestoneItem {
  const threshold = cellNumber(row, 'threshold') ?? 0;
  const progress = cellNumber(row, 'progress') ?? 0;
  const windowEnd = cellText(row, 'windowEnd');
  const daysLeft = windowEnd ? Math.max(0, daysBetween(today, windowEnd) + 1) : 0;
  const remaining = threshold - progress;
  const serverPct = cellNumber(row, 'progressPct');
  const pct = serverPct ?? (threshold > 0 ? (progress / threshold) * 100 : 0);
  const rewardType = cellText(row, 'rewardType') || null;
  return {
    id: cellText(row, 'id'),
    cardId: cellText(row, 'cardId'),
    card: cellText(row, 'card'),
    milestone: cellText(row, 'milestone'),
    threshold,
    progress,
    pct,
    daysLeft,
    perDay: remaining > 0 && daysLeft > 0 ? remaining / daysLeft : null,
    countsTransactions: cellText(row, 'basis') === 'TXN_COUNT',
    rewardType,
    rewardTypeLabel: rewardType ? (rewardLabels?.[rewardType] ?? rewardType.toLowerCase()) : null,
    payoutValue: cellNumber(row, 'payoutValue'),
  };
}

/** The first (most progressed) milestone of each card, in the server's order. */
export function nearestPerCard(data: TableData, today: string): MilestoneItem[] {
  const rewardLabels = data.columns.find((c) => c.key === 'rewardType')?.valueLabels;
  const seen = new Set<string>();
  const out: MilestoneItem[] = [];
  for (const row of data.rows) {
    const it = item(row, today, rewardLabels);
    const key = it.cardId || it.card;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}
