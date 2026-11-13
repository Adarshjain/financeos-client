import type { CorporateActionSchemeChild, CorporateActionSchemeDetails } from '@/lib/api/types';

export const noticeSource = { url: 'https://example.test/notice-1', date: '2024-12-18', quote: 'one share for every ten shares held' };
export const costNotice = { url: 'https://example.test/notice-2', date: '2025-01-20', quote: 'cost split 86.49 : 13.51' };

export const hotels: CorporateActionSchemeChild = {
  symbol: 'ITCHOTELS',
  name: 'ITC Hotels',
  isin: 'INE000000001',
  listedOn: '2025-01-29',
  yahooSymbol: 'ITCHOTELS.NS',
  instrumentId: 'i-itch',
  ratioFrom: 10,
  ratioTo: 1,
  ratioSource: noticeSource,
  childCostPct: 13.51,
};

/** One child, notice-backed cost split, one account whose holdings file agrees. */
export const demergerDetails = (over: Partial<CorporateActionSchemeDetails> = {}): CorporateActionSchemeDetails => ({
  children: [hotels],
  parentCostPct: 86.49,
  costKind: 'NOTICE',
  costSource: costNotice,
  missing: [],
  checkedAt: '2026-11-12T05:00:00Z',
  holdingsCheck: [{ brokerAccountId: 'b1', accountName: 'Groww', source: 'SNAPSHOT', asOf: '2026-11-12', expectedQty: 12, foundQty: 12, agrees: true }],
  ...over,
});

const childTwo: CorporateActionSchemeChild = {
  symbol: 'BETACO',
  name: 'Beta Co',
  isin: null,
  listedOn: '2025-02-03',
  yahooSymbol: 'BETACO.NS',
  instrumentId: null,
  ratioFrom: 5,
  ratioTo: 2,
  ratioSource: noticeSource,
  childCostPct: 10,
};
const childThree: CorporateActionSchemeChild = { ...childTwo, symbol: 'GAMMACO', name: 'Gamma Co', yahooSymbol: 'GAMMACO.NS', childCostPct: 5, ratioFrom: 1, ratioTo: 1 };

/** Three children taking 13.51%, 10% and 5% of the original cost. */
export const multiDetails = (): CorporateActionSchemeDetails =>
  demergerDetails({ children: [hotels, childTwo, childThree], parentCostPct: 71.49 });
