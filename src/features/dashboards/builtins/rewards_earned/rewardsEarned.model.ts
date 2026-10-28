// The rewards_fy view's numbers from the reward_earnings pivot (one row per
// card: cashInr, points, pointsValueInr, valueInr summed over this financial
// year). The headline counts rupees only — cashback plus points on cards that
// have a point value; points on cards without one are listed apart.

import { formatCount, formatMoney } from '@/lib/format';
import { buildFilter } from '@/lib/reports.helpers';
import type { PivotRow, PivotTableData, RunReportRequest } from '@/lib/reports.types';

import { adhocKpi, cellNumber } from '../builtin.helpers';

export interface RewardCardRow {
  key: string;
  /** The card's id (pivot `ids.cardId`); null when the server sent none. */
  cardId: string | null;
  card: string;
  cash: number;
  points: number;
  /** Rupee value of the points; 0 when the card has no point value. */
  pointsValue: number;
  /** Points earned on a card with no point value set. */
  unvalued: boolean;
}

export interface RewardsEarnedModel {
  /** Σ cashback + Σ value of points on valued cards. */
  totalInr: number;
  /** Points earned on cards without a point value. */
  unvaluedPoints: number;
  rows: RewardCardRow[];
}

/** A pivot row's ids (computed datasources send the id behind each id-backed row dimension). */
type PivotRowWithIds = PivotRow & { ids?: Record<string, string | null> | null };

export function buildRewardsEarned(data: PivotTableData): RewardsEarnedModel {
  const columnKey = data.columns[0]?.key ?? '';
  const rows = (data.rows as PivotRowWithIds[]).map((row): RewardCardRow => {
    const cells = row.cells[columnKey] ?? {};
    const cash = cellNumber(cells, 'cashInr_sum') ?? 0;
    const points = cellNumber(cells, 'points_sum') ?? 0;
    const pointsValue = cellNumber(cells, 'pointsValueInr_sum') ?? 0;
    return {
      key: row.key,
      cardId: row.ids?.cardId ?? null,
      card: row.values.card ?? row.key,
      cash,
      points,
      pointsValue,
      unvalued: points > 0 && pointsValue <= 0,
    };
  });
  return {
    totalInr: rows.reduce((s, r) => s + r.cash + r.pointsValue, 0),
    unvaluedPoints: rows.reduce((s, r) => s + (r.unvalued ? r.points : 0), 0),
    rows,
  };
}

/** Reward value earned this FY, optionally on one card. */
export function rewardsRequest(cardId: string | null): RunReportRequest {
  const filters = [buildFilter('effectiveDate', 'current_fy')];
  if (cardId) filters.push(buildFilter('card', 'is', cardId));
  return adhocKpi('reward_earnings', 'valueInr', filters);
}

/** The card's earnings in its own unit; `withValue: false` drops the ≈ rupee value of points. */
export function nativeText(row: RewardCardRow, { withValue = true }: { withValue?: boolean } = {}): string {
  const parts: string[] = [];
  if (row.points > 0) {
    parts.push(row.unvalued || !withValue ? formatCount(row.points, 'pts') : `${formatCount(row.points, 'pts')} ≈ ${formatMoney(row.pointsValue)}`);
  }
  if (row.cash > 0 || parts.length === 0) parts.push(formatMoney(row.cash));
  return parts.join(' + ');
}
