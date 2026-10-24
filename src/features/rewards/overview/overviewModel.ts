import { windowLabel } from '@/features/accounts/detail/rewards/rewardsModel';
import { formatAmount, formatRupees } from '@/features/accounts/list/accountsList';
import { appHref } from '@/features/shell/routes';

import { rewardsCardHref } from './rewardsTabs';

/** One card's total over its own reward year, as `/rewards/totals` reports it. */
export interface CardTotal {
  accountId: string;
  from: string;
  to: string;
  calendarYearFallback: boolean;
  points: number;
  grossValueInr?: number | null;
  /** Null while the account has no point value for its points. */
  pointValueInr?: number | null;
}

export interface OverviewCardInput {
  id: string;
  name: string;
  last4?: string | null;
  bank?: string | null;
}

export interface OverviewCard {
  id: string;
  name: string;
  /** "••7741 · HDFC · anniversary year 15 Mar → 14 Mar". */
  subtitle: string;
  /** Rupees earned this reward year; "₹1,502 + 1,040 pts" while the card's points have no point value. */
  earned: string;
  /** The card earned points but has no point value to turn them into rupees. */
  needsPointValue: boolean;
  href: string;
  /** Where to set the point value. */
  setValueHref: string;
}

export interface RewardsOverviewModel {
  /** All cards added up: "₹1,502 + 1,040 pts". */
  total: string;
  cards: OverviewCard[];
}

const pts = (n: number) => `${formatAmount(n, 0)} pts`;

/** "₹1,502", "₹1,502 + 1,040 pts", or "1,040 pts" when there are no rupees at all. */
export function earnedText(rupees: number, unvaluedPoints: number): string {
  if (unvaluedPoints <= 0) return formatRupees(rupees);
  return rupees > 0 ? `${formatRupees(rupees)} + ${pts(unvaluedPoints)}` : pts(unvaluedPoints);
}

/**
 * The cards' earnings, highest first, and the total. A card's ₹ is its gross value (cashback and milestones, plus
 * points at the card's point value); points of a card with no point value (`unvalued`) are added as points.
 */
export function buildOverview(
  cards: readonly OverviewCardInput[],
  totals: readonly CardTotal[],
  unvalued: ReadonlySet<string>
): RewardsOverviewModel {
  const rows = cards.map((card) => {
    const total = totals.find((t) => t.accountId === card.id);
    const rupees = total?.grossValueInr ?? 0;
    const points = total && unvalued.has(card.id) ? Math.max(0, total.points) : 0;
    const identity = [card.last4 ? `••${card.last4}` : null, card.bank || null].filter(Boolean);
    const window = total ? windowLabel({ from: total.from, to: total.to, calendarYear: total.calendarYearFallback }) : null;
    return {
      rupees,
      points,
      card: {
        id: card.id,
        name: card.name,
        subtitle: [...identity, window].filter(Boolean).join(' · '),
        earned: earnedText(rupees, points),
        needsPointValue: points > 0,
        href: rewardsCardHref(card.id),
        setValueHref: appHref(`/rewards/rules?account=${card.id}`),
      } satisfies OverviewCard,
    };
  });
  rows.sort((a, b) => b.rupees - a.rupees || b.points - a.points || a.card.name.localeCompare(b.card.name));
  return {
    total: earnedText(
      rows.reduce((sum, r) => sum + r.rupees, 0),
      rows.reduce((sum, r) => sum + r.points, 0)
    ),
    cards: rows.map((r) => r.card),
  };
}
