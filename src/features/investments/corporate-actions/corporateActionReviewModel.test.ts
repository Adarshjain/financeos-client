import { describe, expect, it } from 'vitest';

import type { CorporateActionReviewItem } from '@/lib/api/types';

import { appliedCard, notTradingCard, priceFeedText, REASON_TEXT, reviewCard, reviewHeading } from './corporateActionReviewModel';

const base: CorporateActionReviewItem = {
  id: 's-1',
  kind: 'bonus',
  status: 'pending',
  reason: 'YAHOO_MISSING',
  exDate: '2025-06-10',
  ratioFrom: 1,
  ratioTo: 2,
  subject: 'Bonus issue 1:1',
  instrument: { id: 'i-1', name: 'Acme Ltd', symbol: 'ACME', exchange: 'NSE' },
  createdAt: '2025-06-11T06:00:00Z',
  source: 'NSE',
  feedFactor: null,
  sharesBefore: 30,
  sharesAfter: 60,
  avgCostBefore: 1420,
  avgCostAfter: 710,
  possibleChildren: [],
};
const line = (item: CorporateActionReviewItem, label: string) => reviewCard(item).lines.find((l) => l.label === label)?.value;

describe('reviewHeading', () => {
  it('names each kind', () => {
    expect(reviewHeading(base)).toBe('Bonus 1:1 · Acme Ltd');
    expect(reviewHeading({ ...base, kind: 'split', ratioFrom: 1, ratioTo: 5 })).toBe('Split 1→5 · Acme Ltd');
    expect(reviewHeading({ ...base, kind: 'merger' })).toBe('Merger · Acme Ltd');
    expect(reviewHeading({ ...base, kind: 'demerger' })).toBe('Demerger · Acme Ltd');
    expect(reviewHeading({ ...base, kind: 'oversold' })).toBe('Sold more than held · Acme Ltd');
    expect(reviewHeading({ ...base, kind: 'other' })).toBe('Corporate action · Acme Ltd');
  });
  it('drops the ratio when it is unknown', () => {
    expect(reviewHeading({ ...base, ratioFrom: null, ratioTo: null })).toBe('Bonus · Acme Ltd');
    expect(reviewHeading({ ...base, kind: 'split', ratioFrom: null, ratioTo: null })).toBe('Split · Acme Ltd');
  });
});

describe('reviewCard', () => {
  it('shows the notice, shares, cost, feed and reason for a bonus', () => {
    const card = reviewCard(base);
    expect(card.subheading).toBe('Ex-date 10/06/25');
    expect(line(base, 'Exchange notice (NSE)')).toBe('Bonus issue 1:1');
    expect(line(base, 'Your shares')).toBe('30 held the day before → 60 after');
    expect(line(base, 'Cost per share')).toBe('₹1,420.00 → ₹710.00; total cost stays the same');
    expect(line(base, 'Price feed')).toBe('No split on this date');
    expect(line(base, "Why we didn't apply it")).toBe(REASON_TEXT.YAHOO_MISSING);
  });
  it('has a sentence for every reason', () => {
    for (const reason of Object.keys(REASON_TEXT) as (keyof typeof REASON_TEXT)[]) {
      expect(line({ ...base, reason }, "Why we didn't apply it")).toBe(REASON_TEXT[reason]);
    }
    expect(REASON_TEXT.POSSIBLE_DUPLICATE).toContain('within 5 days');
  });
  it('merger and demerger: shares before only and the cost-split sentence', () => {
    const merger = { ...base, kind: 'merger' as const, reason: 'NEEDS_DETAILS' as const, sharesAfter: null };
    expect(line(merger, 'Your shares')).toBe('30 held the day before');
    expect(line(merger, 'Cost per share')).toBe("You'll split the cost between the companies when you record it");
    expect(line({ ...merger, kind: 'demerger' }, 'Cost per share')).toContain('split the cost');
  });
  it('hides what is null', () => {
    const bare = { ...base, subject: null, sharesBefore: null, sharesAfter: null, avgCostBefore: null, avgCostAfter: null, reason: null };
    expect(reviewCard(bare).lines.map((l) => l.label)).toEqual(['Price feed']);
  });
  it('labels the notice without a source', () => {
    expect(line({ ...base, source: null }, 'Exchange notice')).toBe('Bonus issue 1:1');
  });
  it('oversold: what we found, shares before the sale, no notice or feed', () => {
    const o: CorporateActionReviewItem = { ...base, kind: 'oversold', reason: null, subject: null, soldQty: 10, sellDate: '2025-03-04', sharesBefore: 5, sharesAfter: null };
    expect(line(o, 'What we found')).toBe('You sold 10 more shares than you held, on 04/03/25');
    expect(line(o, 'Your shares')).toBe('5 held before that sale');
    expect(line(o, 'Price feed')).toBeUndefined();
    expect(line(o, "Why we didn't apply it")).toBe("Usually a split or bonus that isn't recorded yet, or a missing buy.");
  });
});

describe('priceFeedText', () => {
  it('reads missing, factor and not checked', () => {
    expect(priceFeedText({ reason: 'YAHOO_MISSING', feedFactor: 2 })).toBe('No split on this date');
    expect(priceFeedText({ reason: 'YAHOO_MISMATCH', feedFactor: 2 })).toBe('×2 on this date');
    expect(priceFeedText({ reason: 'UNCLEAR_TEXT', feedFactor: null })).toBe('Not checked');
  });
});

describe('appliedCard', () => {
  it('shows the date applied, shares, cost and the feed factor', () => {
    const card = appliedCard({ ...base, status: 'auto_applied', reason: null, feedFactor: 2 });
    expect(card.subheading).toBe('Applied on 11/06/25');
    expect(card.lines.find((l) => l.label === 'Cost per share')?.value).toBe('₹1,420.00 → ₹710.00');
    expect(card.lines.find((l) => l.label === 'Price feed')?.value).toBe('×2 on this date');
  });
  it('uses resolvedAt for the applied date when present', () => {
    expect(appliedCard({ ...base, resolvedAt: '2025-06-12T06:00:00Z' }).subheading).toBe('Applied on 12/06/25');
  });
  it('older rows: Not recorded, and no cost line when null', () => {
    const card = appliedCard({ ...base, avgCostBefore: null, avgCostAfter: null, reason: null });
    expect(card.lines.find((l) => l.label === 'Price feed')?.value).toBe('Not recorded');
    expect(card.lines.some((l) => l.label === 'Cost per share')).toBe(false);
  });
});

describe('notTradingCard', () => {
  const stock = { instrument: base.instrument, sharesHeld: 12.5, lastPrice: 88.5, lastPriceDate: '2025-05-02', markedAt: '2025-06-01T00:00:00Z' };
  it('lists the facts and the advice', () => {
    const card = notTradingCard(stock);
    expect(card.heading).toBe('Acme Ltd no longer trades');
    expect(card.lines).toEqual(['No price on NSE or BSE since 01/06/25', 'You hold 12.5 shares', 'Last price ₹88.50 on 02/05/25']);
    expect(card.advice).toContain('it stays in your holdings at zero value');
  });
  it('hides the last price and mark date when null', () => {
    expect(notTradingCard({ ...stock, lastPrice: null, lastPriceDate: null, markedAt: null }).lines).toEqual(['You hold 12.5 shares']);
  });
});

describe('reviewCard: detected demerger and merger', () => {
  const cand = { symbol: 'ITCHOTELS', name: 'ITC Hotels', listedOn: '2025-01-29', yahooSymbol: 'ITCHOTELS.NS' };

  it('a demerger carries the note and one line per possible new company', () => {
    const card = reviewCard({ ...base, kind: 'demerger', ratioFrom: null, ratioTo: null, possibleChildren: [cand] });
    expect(card.note).toContain('only says "Demerger"');
    expect(card.candidates).toEqual(['Possible new company: ITC Hotels (ITCHOTELS), listed on NSE 29/01/25']);
  });

  it('a merger has the note only when the ratio is missing, and never candidates', () => {
    expect(reviewCard({ ...base, kind: 'merger', ratioFrom: null, ratioTo: null }).note).toContain('only says "Merger"');
    expect(reviewCard({ ...base, kind: 'merger', ratioFrom: 1, ratioTo: 2 }).note).toBeUndefined();
    expect(reviewCard({ ...base, kind: 'merger', ratioFrom: null, ratioTo: null }).candidates).toBeUndefined();
  });

  it('other kinds have neither', () => {
    expect(reviewCard(base).note).toBeUndefined();
    expect(reviewCard(base).candidates).toBeUndefined();
  });
});
