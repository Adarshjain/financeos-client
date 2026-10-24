import { windowLabel } from '@/features/accounts/detail/rewards/rewardsModel';
import { formatAmount, formatCompactRupees, formatDayMonth, formatRupees } from '@/features/accounts/list/accountsList';
import { bankById } from '@/features/banks/banks';
import { appHref } from '@/features/shell/routes';

import { rewardsCardHref } from './rewardsTabs';

/** One card's total over its own reward year, as `/rewards/totals` reports it. */
export interface CardTotal {
  accountId: string;
  from: string;
  to: string;
  calendarYearFallback: boolean;
  points: number;
  /** Points paid by points-currency milestones; they count as earned points too. */
  milestonePoints?: number | null;
  grossValueInr?: number | null;
  /** Null while the account has no point value for its points. */
  pointValueInr?: number | null;
  /** The cap nearest to exhaustion this period; null when the card has no cap. */
  nearestCap?: NearestCap | null;
  /** The nearest unmet milestone; null when none is open. */
  nextMilestone?: NextMilestone | null;
  /** The latest milestone met, shown when none is open. */
  lastMet?: LastMet | null;
}

export interface NearestCap {
  label: string;
  used: number;
  cap: number;
  unit: 'RUPEES' | 'POINTS';
  windowEnd: string;
}

export interface NextMilestone {
  name: string;
  progress: number;
  threshold: number;
  basis: 'SPEND' | 'TXN_COUNT';
  windowEnd: string;
}

export interface LastMet {
  name: string;
  achievedOn: string;
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
  /** The bank's id, for its logo; null when the card has none. */
  bankId: string | null;
  /** "HDFC Bank · ••7741": the bank's display name, then the last four. */
  identity: string;
  /** The card's reward year: "Anniversary year 15 Mar – 14 Mar 27"; empty when the totals have no row for it. */
  year: string;
  /** "₹100 left of ₹500 · Dining"; "—" when the card has no cap. */
  capLeft: string;
  /** "₹1.2L to go · Annual spend", "3 more · Ten swipes", "Met · Oct" or "—". */
  nextMilestone: string;
  /** "HDFC Bank · ••7741 · Anniversary year 15 Mar – 14 Mar 27": the phone's second line. */
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

/** Points earned in the reward year: the earning lines' plus the milestones'. */
export const earnedPoints = (total: Pick<CardTotal, 'points' | 'milestonePoints'>): number =>
  total.points + (total.milestonePoints ?? 0);

const pts = (n: number) => `${formatAmount(n, 0)} pts`;

/** What is left of the cap nearest to exhaustion: "₹100 left of ₹500 · Dining", "120 pts left of 500 pts · Fuel", "₹0 left · Dining" once used up. */
export function capLeftText(cap: NearestCap | null | undefined): string {
  if (!cap) return '—';
  const points = cap.unit === 'POINTS';
  const amount = (n: number) => (points ? pts(n) : formatCompactRupees(n));
  const left = Math.max(0, cap.cap - cap.used);
  return left === 0 ? `${amount(0)} left · ${cap.label}` : `${amount(left)} left of ${amount(cap.cap)} · ${cap.label}`;
}

/** The nearest unmet milestone, else the latest met one, else "—". */
export function nextMilestoneText(
  next: NextMilestone | null | undefined,
  lastMet: LastMet | null | undefined
): string {
  if (next) {
    const left = Math.max(0, next.threshold - next.progress);
    return next.basis === 'SPEND'
      ? `${formatCompactRupees(left)} to go · ${next.name}`
      : `${left} more · ${next.name}`;
  }
  if (lastMet) return `Met · ${formatDayMonth(lastMet.achievedOn).split(' ')[1] ?? ''}`.trim();
  return '—';
}

/** "₹100 left of ₹500 · Dining" → the figure, then the label under it; text with no label stays one line. */
export function labelLines(text: string): { main: string; sub: string | null } {
  const at = text.indexOf(' · ');
  return at < 0 ? { main: text, sub: null } : { main: text.slice(0, at), sub: text.slice(at + 3) };
}

/** "Anniversary year 15 Mar – 14 Mar 27" → the range, then the kind of year under it. */
export function yearLines(year: string): { main: string; sub: string | null } {
  const m = /^(Anniversary year|Calendar year)\s+(.+)$/.exec(year);
  return m ? { main: m[2], sub: m[1] } : { main: year, sub: null };
}

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
    const points = total && unvalued.has(card.id) ? Math.max(0, earnedPoints(total)) : 0;
    // The bank's display name, never its id; an id the app does not know is shown as it came.
    const bankName = card.bank ? (bankById(card.bank)?.name ?? card.bank) : null;
    const identity = [bankName, card.last4 ? `••${card.last4}` : null].filter(Boolean).join(' · ');
    const year = total ? windowLabel({ from: total.from, to: total.to, calendarYear: total.calendarYearFallback }) : '';
    return {
      rupees,
      points,
      card: {
        id: card.id,
        name: card.name,
        bankId: card.bank || null,
        identity,
        year,
        capLeft: capLeftText(total?.nearestCap),
        nextMilestone: nextMilestoneText(total?.nextMilestone, total?.lastMet),
        subtitle: [identity, year].filter(Boolean).join(' · '),
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
