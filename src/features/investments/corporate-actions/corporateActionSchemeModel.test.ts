import { describe, expect, it } from 'vitest';

import type { CorporateActionReviewItem } from '@/lib/api/types';

import { appliedCard, notTradingCard, reviewCard } from './corporateActionReviewModel';
import { costNotice, demergerDetails, hotels, multiDetails, noticeSource } from './corporateActionScheme.fixtures';
import { costAllocationFor, firstUnrecordedChild, holdingsLines, missingText, prefillSources, schemeEvidence } from './corporateActionSchemeModel';

const texts = (lines: { text: string }[]) => lines.map((l) => l.text);
const ctx = { kind: 'demerger' as const, parentName: 'ITC' };

describe('schemeEvidence', () => {
  it('names the new company, the ratio and the notice it came from', () => {
    const lines = schemeEvidence(demergerDetails(), ctx);
    expect(lines[0].text).toBe('New company: ITC Hotels (ITCHOTELS), listed on NSE 29/01/25');
    expect(lines[1].text).toBe('1 ITC Hotels share for every 10 ITC shares');
    expect(lines[2]).toEqual({ text: "From the company's notice of 18/12/24", noticeUrl: noticeSource.url });
  });

  it('says "Merging into" for a merger and skips the cost split', () => {
    const lines = texts(schemeEvidence(demergerDetails(), { kind: 'merger', parentName: 'ITC' }));
    expect(lines[0]).toBe('Merging into: ITC Hotels (ITCHOTELS), listed on NSE 29/01/25');
    expect(lines.some((l) => l.startsWith('Cost split'))).toBe(false);
  });

  it('leaves out the listing date and the ratio when they are unknown', () => {
    const lines = texts(schemeEvidence(demergerDetails({ children: [{ ...hotels, listedOn: null, ratioFrom: null, ratioTo: null, ratioSource: undefined }] }), ctx));
    expect(lines[0]).toBe('New company: ITC Hotels (ITCHOTELS)');
    expect(lines.some((l) => l.includes('for every'))).toBe(false);
  });

  it('gives the cost split with a notice source', () => {
    const lines = schemeEvidence(demergerDetails(), ctx);
    const i = lines.findIndex((l) => l.text.startsWith('Cost split'));
    expect(lines[i].text).toBe('Cost split: ITC 86.49%, ITC Hotels 13.51%');
    expect(lines[i + 1]).toEqual({ text: "From the company's notice of 20/01/25", noticeUrl: costNotice.url });
  });

  it('explains an estimated cost split and gives no link', () => {
    const lines = schemeEvidence(demergerDetails({ costKind: 'ESTIMATE', costSource: undefined }), ctx);
    const i = lines.findIndex((l) => l.text.startsWith('Cost split'));
    expect(lines[i + 1]).toEqual({ text: "Estimated from prices around the ex-date. The company hasn't published its split yet." });
  });

  it('shows no cost split when there is none', () => {
    expect(texts(schemeEvidence(demergerDetails({ parentCostPct: null, costKind: null, costSource: undefined }), ctx)).some((l) => l.startsWith('Cost split'))).toBe(false);
  });

  it('says the notice has no date when it has none', () => {
    const lines = schemeEvidence(demergerDetails({ children: [{ ...hotels, ratioSource: { url: 'https://example.test/n', quote: 'q' } }] }), ctx);
    expect(lines[2].text).toBe("From the company's notice");
  });
});

describe('holdingsLines', () => {
  const check = (over: Partial<ReturnType<typeof demergerDetails>['holdingsCheck'][number]>) =>
    demergerDetails({ holdingsCheck: [{ brokerAccountId: 'b1', accountName: 'Groww', source: 'SNAPSHOT', asOf: '2026-11-12', expectedQty: 12, foundQty: 12, agrees: true, ...over }] });

  it('agrees with a holdings file', () => {
    expect(texts(holdingsLines(check({}), 'demerger'))).toEqual(['Groww: holdings file of 12/11/26 shows 12 ITC Hotels shares, as the ratio gives.']);
  });
  it("disagrees with a holdings file", () => {
    expect(texts(holdingsLines(check({ foundQty: 10, agrees: false }), 'demerger'))).toEqual(['Groww: expected 12 ITC Hotels shares, holdings file of 12/11/26 shows 10.']);
  });
  it('agrees with the sales in a tradebook', () => {
    expect(texts(holdingsLines(check({ source: 'TRADEBOOK' }), 'demerger'))).toEqual([
      'Groww: sales in the tradebook up to 12/11/26 add up to 12 ITC Hotels shares, as the ratio gives.',
    ]);
  });
  it('disagrees with the sales in a tradebook', () => {
    expect(texts(holdingsLines(check({ source: 'TRADEBOOK', foundQty: 4, agrees: false }), 'demerger'))).toEqual([
      'Groww: expected 12 ITC Hotels shares, sales in the tradebook up to 12/11/26 add up to 4.',
    ]);
  });
  it('asks for a holdings file when there is no evidence', () => {
    expect(texts(holdingsLines(check({ source: 'NONE', asOf: null, foundQty: 0, agrees: false }), 'demerger'))).toEqual([
      'Groww: no holdings file or sales of ITC Hotels yet. Import a holdings file to confirm.',
    ]);
  });
  it('says one share in the singular and one line per account', () => {
    const d = demergerDetails({
      holdingsCheck: [
        { brokerAccountId: 'b1', accountName: 'Groww', source: 'SNAPSHOT', asOf: '2026-11-12', expectedQty: 1, foundQty: 1, agrees: true },
        { brokerAccountId: 'b2', accountName: 'Zerodha', source: 'NONE', asOf: null, expectedQty: 3, foundQty: 0, agrees: false },
      ],
    });
    const lines = texts(holdingsLines(d, 'demerger'));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('shows 1 ITC Hotels share, as');
  });
  it('does not name one company when there are several', () => {
    expect(texts(holdingsLines({ ...multiDetails(), holdingsCheck: demergerDetails().holdingsCheck }, 'demerger'))[0]).toBe(
      'Groww: holdings file of 12/11/26 shows 12 shares of the new company, as the ratio gives.',
    );
  });
});

describe('missingText', () => {
  const sentence: Record<string, string> = {
    CHILD_NOT_NAMED: "The notices don't name the new company.",
    RATIO_NOT_FOUND: "The notices don't give the ratio.",
    COST_NOT_PUBLISHED_YET: "The company hasn't published the cost split yet. Last checked 12/11/26.",
    COST_UNCLEAR: "The notices mention the cost split but we couldn't read it. Check the company's announcement.",
    NOTICE_SCANNED: "A notice is a scanned document we couldn't read. Check the company's announcement.",
    NOTICES_DISAGREE: "The company's notices give different ratios, so we haven't used any of them.",
    NO_NOTICES: 'We found no notices from the company about this yet. Last checked 12/11/26.',
    NOTICES_UNAVAILABLE: "We couldn't reach the exchange notices. Last checked 12/11/26.",
  };
  it.each(Object.keys(sentence))('maps %s to a plain sentence', (code) => {
    expect(missingText(code, 'demerger', '2026-11-12T05:00:00Z')).toBe(sentence[code]);
  });
  it('names the acquirer for a merger', () => {
    expect(missingText('CHILD_NOT_NAMED', 'merger', '2026-11-12T05:00:00Z')).toBe("The notices don't name the acquiring company.");
  });
  it('shows each code in the evidence, and skips an unknown one', () => {
    const lines = texts(schemeEvidence(demergerDetails({ missing: ['COST_NOT_PUBLISHED_YET', 'SOMETHING_NEW'] }), ctx));
    expect(lines).toContain(sentence.COST_NOT_PUBLISHED_YET);
    expect(lines.filter((l) => l.includes('SOMETHING'))).toEqual([]);
  });
});

describe('costAllocationFor: the server applies the percentage to the cost that is left', () => {
  const kids = multiDetails().children;
  it('takes the first child as it is', () => expect(costAllocationFor(kids, 0)).toBe(13.51));
  it('scales the second child by what the first took', () => expect(costAllocationFor(kids, 1)).toBe(11.56));
  it('scales the third by what the first two took', () => expect(costAllocationFor(kids, 2)).toBe(6.54));
  it('is null when a share is unknown or nothing is left', () => {
    expect(costAllocationFor([{ ...kids[0], childCostPct: null }, kids[1]], 1)).toBeNull();
    expect(costAllocationFor([{ ...kids[0], childCostPct: 100 }, kids[1]], 1)).toBeNull();
    expect(costAllocationFor(kids, 5)).toBeNull();
  });
});

describe('notice links', () => {
  it('keep only https addresses', () => {
    const http = { ...noticeSource, url: 'http://example.test/n' };
    const js = { ...noticeSource, url: 'javascript:alert(1)' };
    expect(schemeEvidence(demergerDetails({ children: [{ ...hotels, ratioSource: http }] }), ctx)[2]).toEqual({ text: "From the company's notice of 18/12/24" });
    expect(schemeEvidence(demergerDetails({ children: [{ ...hotels, ratioSource: js }], costSource: js }), ctx).filter((l) => l.noticeUrl)).toEqual([]);
    expect(prefillSources(demergerDetails({ children: [{ ...hotels, ratioSource: http }] }), 'demerger', 0).target[0].noticeUrl).toBeUndefined();
  });
});

describe('firstUnrecordedChild', () => {
  const kids = multiDetails().children;
  const done = (over: object) => ({ type: 'demerger', exDate: '2025-01-06', ...over });
  it('starts at 0 when nothing is recorded', () => expect(firstUnrecordedChild(kids, [], '2025-01-06')).toBe(0));
  it('skips a child recorded by instrument id, then one by symbol', () => {
    expect(firstUnrecordedChild(kids, [done({ targetInstrumentId: 'i-itch' })], '2025-01-06')).toBe(1);
    expect(firstUnrecordedChild(kids, [done({ targetInstrumentId: 'i-itch' }), done({ targetInstrumentSymbol: 'betaco' })], '2025-01-06')).toBe(2);
  });
  it('ignores other dates and other kinds', () => {
    expect(firstUnrecordedChild(kids, [done({ targetInstrumentId: 'i-itch', exDate: '2025-02-01' }), done({ type: 'merger', targetInstrumentId: 'i-itch' })], '2025-01-06')).toBe(0);
  });
});

describe('prefillSources', () => {
  it('gives the notice for the ratio and the cost of a single child', () => {
    const s = prefillSources(demergerDetails(), 'demerger', 0);
    expect(s.ratio).toEqual([{ text: "From the company's notice of 18/12/24", noticeUrl: noticeSource.url }]);
    expect(s.cost).toEqual([{ text: "From the company's notice of 20/01/25", noticeUrl: costNotice.url }]);
    expect(s.target[0].text).toBe("Named in the company's notice of 18/12/24");
  });
  it('says an estimate is from prices, with no link', () => {
    expect(prefillSources(demergerDetails({ costKind: 'ESTIMATE', costSource: undefined }), 'demerger', 0).cost).toEqual([{ text: 'Estimated from prices' }]);
  });
  it('explains the conversion for a later child', () => {
    expect(prefillSources(multiDetails(), 'demerger', 1).cost[1].text).toBe("10% of the original cost, which is 11.56% of what's left after ITC Hotels");
    expect(prefillSources(multiDetails(), 'demerger', 2).cost[1].text).toBe("5% of the original cost, which is 6.54% of what's left after ITC Hotels and Beta Co");
  });
  it('has no cost line for a merger', () => {
    expect(prefillSources(demergerDetails(), 'merger', 0).cost).toEqual([]);
  });
});

const item = (over: Partial<CorporateActionReviewItem>): CorporateActionReviewItem =>
  ({
    id: 's-1', kind: 'demerger', status: 'pending', reason: 'NEEDS_DETAILS', exDate: '2025-01-06', ratioFrom: null, ratioTo: null,
    subject: 'Demerger', instrument: { id: 'i-itc', name: 'ITC', symbol: 'ITC', exchange: 'NSE' }, createdAt: '2025-01-07T00:00:00Z',
    source: 'NSE', sharesBefore: 12, possibleChildren: [{ symbol: 'ITCHOTELS', name: 'ITC Hotels', isin: null, listedOn: '2025-01-29', yahooSymbol: 'ITCHOTELS.NS', instrumentId: null }],
    ...over,
  }) as CorporateActionReviewItem;

describe('review cards', () => {
  it('shows evidence and hides the note and the possible companies when the notices were read', () => {
    const card = reviewCard(item({ details: demergerDetails() }));
    expect(card.evidence?.[0].text).toContain('ITC Hotels (ITCHOTELS)');
    expect(card.note).toBeUndefined();
    expect(card.candidates).toBeUndefined();
  });
  it('keeps today\'s note and possible companies without details', () => {
    const card = reviewCard(item({ details: undefined }));
    expect(card.evidence).toBeUndefined();
    expect(card.note).toContain('The exchange notice only says "Demerger"');
    expect(card.candidates).toHaveLength(1);
  });
  it('keeps the possible companies when the notices name none', () => {
    const card = reviewCard(item({ details: demergerDetails({ children: [], missing: ['CHILD_NOT_NAMED'] }) }));
    expect(card.candidates).toHaveLength(1);
    expect(card.evidence?.at(-1)?.text).toBe("The notices don't name the new company.");
  });
  it('applied card shows why and the evidence', () => {
    const card = appliedCard(item({ status: 'auto_applied', reason: null, details: demergerDetails(), appliedBecause: 'The notice and your Groww holdings file agree.' }));
    expect(card.because).toBe('The notice and your Groww holdings file agree.');
    expect(card.evidence?.length).toBeGreaterThan(0);
  });
  it('applied card without details has neither', () => {
    const card = appliedCard(item({ status: 'auto_applied', reason: null }));
    expect(card.because).toBeUndefined();
    expect(card.evidence).toBeUndefined();
  });
  it('not-trading card shows what it merged into', () => {
    const stock = { instrument: { id: 'i-x', name: 'Old Co', symbol: 'OLD' }, sharesHeld: 5, details: demergerDetails() };
    expect(notTradingCard(stock).evidence?.[0].text).toMatch(/^Merging into: /);
    expect(notTradingCard({ ...stock, details: undefined }).evidence).toBeUndefined();
  });
});
