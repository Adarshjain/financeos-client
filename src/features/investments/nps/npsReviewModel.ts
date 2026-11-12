import type { components } from '@/lib/api/schema';
import type { NpsReviewAccount, NpsReviewPayment, NpsReviewResponse, NpsReviewSetup, NpsReviewUnrecorded } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';

type NpsReviewContribution = components['schemas']['NpsReviewContribution'];

/** One amount, with paise when there are any. */
export const reviewMoney = (value: number): string => formatMoney(value, { decimals: 'auto' });

/** How many things are waiting for the user on the NPS page: each pairing, each unrecorded payment, and the setup offer. */
export function reviewCount(review: NpsReviewResponse | null | undefined): number {
  if (!review) return 0;
  return review.matches.length + review.unrecorded.length + (review.setup ? 1 : 0);
}

/** Why the app didn't pair this contribution with a payment by itself. */
export function matchWhy(why: string): string | null {
  if (why === 'MULTIPLE_CANDIDATES') return 'More than one bank payment fits this contribution.';
  if (why === 'SHARED_PAYMENT') return 'This payment also fits another contribution.';
  return null;
}

/** "PRAN ••1234 · Ravi" (the holder is left out when there is none). */
export function accountLabel(a: NpsReviewAccount): string {
  return ['PRAN ••' + a.pranLast4, a.holderName || null].filter(Boolean).join(' · ');
}

export const tierLabel = (tier: 'I' | 'II'): string => `Tier ${tier}`;

const SOURCES: Record<NpsReviewContribution['source'], string> = {
  MANUAL: 'Added by hand',
  STATEMENT: 'NPS statement',
  EMAIL: 'NPS email',
  BANK: 'Bank payment',
};

/** Where the contribution came from; a statement says the period it covers. */
export function sourceLine(c: NpsReviewContribution): string {
  const label = SOURCES[c.source] ?? 'NPS statement';
  if (c.statementPeriodStart && c.statementPeriodEnd) {
    return `${label}, ${formatDate(c.statementPeriodStart, 'input')}–${formatDate(c.statementPeriodEnd, 'input')}`;
  }
  return label;
}

/** The facts of a contribution, ready to draw. */
export function contributionFacts(c: NpsReviewContribution): { amount: string; date: string; tier: string; account: string; source: string } {
  return { amount: reviewMoney(c.amount), date: formatDate(c.date, 'input'), tier: tierLabel(c.tier), account: accountLabel(c.account), source: sourceLine(c) };
}

/** A bank payment, in full. */
export function paymentFacts(p: NpsReviewPayment): { date: string; amount: string; description: string; account: string } {
  return { date: formatDate(p.date, 'input'), amount: reviewMoney(p.amount), description: p.description?.trim() || 'No description', account: p.accountName };
}

/** What made the app think the payment is NPS; null when it can't say. */
export function matchedLine(u: NpsReviewUnrecorded): string | null {
  return u.matchedOn ? `Looks like NPS because the description has “${u.matchedOn}”` : null;
}

/** "12 days ago, and no NPS statement has it yet" */
export function sinceLine(daysSince: number): string {
  if (daysSince <= 0) return 'Today, and no NPS statement has it yet';
  return `${daysSince} ${daysSince === 1 ? 'day' : 'days'} ago, and no NPS statement has it yet`;
}

export interface RecordOption {
  value: string;
  label: string;
  accountId: string;
  tier: 'I' | 'II';
}

/** Every account and tier the payment could be recorded to. */
export function recordOptions(u: NpsReviewUnrecorded): RecordOption[] {
  return u.recordTo.flatMap((a) =>
    a.tiers.map((tier) => ({ value: `${a.id}:${tier}`, label: `${accountLabel(a)} · ${tierLabel(tier)}`, accountId: a.id, tier })),
  );
}

/** "6 payments, ₹1,20,000 from 05/01/25 to 05/06/25" */
export function setupLine(s: NpsReviewSetup): string {
  return `${s.paymentCount} ${s.paymentCount === 1 ? 'payment' : 'payments'}, ${reviewMoney(s.totalAmount)} from ${formatDate(s.firstDate, 'input')} to ${formatDate(s.lastDate, 'input')}`;
}
