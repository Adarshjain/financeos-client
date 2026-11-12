import type { CorporateActionReviewItem, NotTradingStock } from '@/lib/api/types';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';

import { ratioText } from './corporateActionRatioModel';

export type ReviewReason = NonNullable<CorporateActionReviewItem['reason']>;

/** Why the app didn't apply a detected action on its own, one sentence per reason. */
export const REASON_TEXT: Record<ReviewReason, string> = {
  COMBINED_SAME_DAY: "The exchange listed more than one change on this date, so we can't tell how they combine.",
  NEEDS_DETAILS: "A merger or demerger needs the new company, ratio and cost split, which the notice doesn't give.",
  UNCLEAR_TEXT: "We couldn't read the ratio from the notice.",
  NO_PRICE_SYMBOL: "We couldn't find this stock on the price feed to double-check.",
  YAHOO_MISSING: 'The price feed shows no split on this date.',
  YAHOO_MISMATCH: 'The price feed shows a different ratio.',
  POSSIBLE_DUPLICATE: 'You already recorded a similar action within 5 days of this date.',
};

export const OVERSOLD_WHY = "Usually a split or bonus that isn't recorded yet, or a missing buy.";
export const NOT_TRADING_ADVICE = 'If it merged into another company, record the merger. If it was delisted, it stays in your holdings at zero value.';

export interface ReviewLine {
  label: string;
  value: string;
}

export interface ReviewCardModel {
  id: string;
  heading: string;
  /** "Ex-date 10/06/2025" or "Applied on 11/06/2025". */
  subheading: string;
  lines: ReviewLine[];
}

const date = (v: string | null | undefined) => formatDate(v, 'input');
const qty = (v: number | null | undefined) => formatQuantity(v);
const rupees = (v: number) => formatMoney(v, { decimals: 'exact' });

/** "Bonus 1:1", "Split 1→5", "Merger", "Demerger", "Sold more than held". */
export function reviewHeading(item: CorporateActionReviewItem): string {
  const name = item.instrument.name;
  const hasRatio = item.ratioFrom != null && item.ratioTo != null;
  let kind: string;
  switch (item.kind) {
    case 'bonus':
      kind = hasRatio ? `Bonus ${ratioText('bonus', item.ratioFrom ?? null, item.ratioTo ?? null, true)}` : 'Bonus';
      break;
    case 'split':
      kind = hasRatio ? `Split ${item.ratioFrom}→${item.ratioTo}` : 'Split';
      break;
    case 'merger':
      kind = 'Merger';
      break;
    case 'demerger':
      kind = 'Demerger';
      break;
    case 'oversold':
      kind = 'Sold more than held';
      break;
    default:
      kind = 'Corporate action';
  }
  return `${kind} · ${name}`;
}

const noticeLine = (item: CorporateActionReviewItem): ReviewLine[] =>
  item.subject ? [{ label: item.source ? `Exchange notice (${item.source})` : 'Exchange notice', value: item.subject }] : [];

const isRatioKind = (item: CorporateActionReviewItem) => item.kind === 'split' || item.kind === 'bonus';

function sharesLine(item: CorporateActionReviewItem): ReviewLine[] {
  if (item.sharesBefore == null) return [];
  const before = qty(item.sharesBefore);
  if (item.kind === 'oversold') return [{ label: 'Your shares', value: `${before} held before that sale` }];
  if (isRatioKind(item) && item.sharesAfter != null) {
    return [{ label: 'Your shares', value: `${before} held the day before → ${qty(item.sharesAfter)} after` }];
  }
  return [{ label: 'Your shares', value: `${before} held the day before` }];
}

function costLine(item: CorporateActionReviewItem): ReviewLine[] {
  if (isRatioKind(item)) {
    if (item.avgCostBefore == null || item.avgCostAfter == null) return [];
    return [{ label: 'Cost per share', value: `${rupees(item.avgCostBefore)} → ${rupees(item.avgCostAfter)}; total cost stays the same` }];
  }
  if (item.kind === 'merger' || item.kind === 'demerger') {
    return [{ label: 'Cost per share', value: "You'll split the cost between the companies when you record it" }];
  }
  return [];
}

/** What the price feed says about this date. */
export function priceFeedText(item: Pick<CorporateActionReviewItem, 'reason' | 'feedFactor'>): string {
  if (item.reason === 'YAHOO_MISSING') return 'No split on this date';
  if (item.feedFactor != null) return `×${formatQuantity(item.feedFactor)} on this date`;
  return 'Not checked';
}

export function reviewReasonText(item: Pick<CorporateActionReviewItem, 'kind' | 'reason'>): string {
  if (item.reason) return REASON_TEXT[item.reason];
  return item.kind === 'oversold' ? OVERSOLD_WHY : '';
}

/** A detected action that needs the user's decision. */
export function reviewCard(item: CorporateActionReviewItem): ReviewCardModel {
  const lines: ReviewLine[] = [];
  if (item.kind === 'oversold') {
    lines.push({
      label: 'What we found',
      value: `You sold ${qty(item.soldQty)} more shares than you held, on ${date(item.sellDate)}`,
    });
  } else {
    lines.push(...noticeLine(item));
  }
  lines.push(...sharesLine(item), ...costLine(item));
  if (item.kind !== 'oversold') lines.push({ label: 'Price feed', value: priceFeedText(item) });
  const why = reviewReasonText(item);
  if (why) lines.push({ label: "Why we didn't apply it", value: why });
  return { id: item.id, heading: reviewHeading(item), subheading: `Ex-date ${date(item.exDate)}`, lines };
}

/** An action the app applied on its own. */
export function appliedCard(item: CorporateActionReviewItem): ReviewCardModel {
  const lines: ReviewLine[] = [...noticeLine(item), ...sharesLine(item)];
  if (item.avgCostBefore != null && item.avgCostAfter != null) {
    lines.push({ label: 'Cost per share', value: `${rupees(item.avgCostBefore)} → ${rupees(item.avgCostAfter)}` });
  }
  lines.push({
    label: 'Price feed',
    value: item.feedFactor != null ? `×${formatQuantity(item.feedFactor)} on this date` : 'Not recorded',
  });
  return { id: item.id, heading: reviewHeading(item), subheading: `Applied on ${date(item.resolvedAt ?? item.createdAt)}`, lines };
}

export interface NotTradingCardModel {
  id: string;
  heading: string;
  lines: string[];
  advice: string;
}

/** A held stock with no price on NSE or BSE for a while. */
export function notTradingCard(stock: NotTradingStock): NotTradingCardModel {
  const lines: string[] = [];
  if (stock.markedAt) lines.push(`No price on NSE or BSE since ${date(stock.markedAt)}`);
  lines.push(`You hold ${qty(stock.sharesHeld)} shares`);
  if (stock.lastPrice != null) lines.push(`Last price ${rupees(stock.lastPrice)}${stock.lastPriceDate ? ` on ${date(stock.lastPriceDate)}` : ''}`);
  return { id: stock.instrument.id, heading: `${stock.instrument.name} no longer trades`, lines, advice: NOT_TRADING_ADVICE };
}
