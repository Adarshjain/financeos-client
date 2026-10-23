import { describe, expect, it } from 'vitest';

import { holdingHref, HOLDINGS_HREF, investmentsTabHref, investmentsTabs, isHoldingDetailPath } from './investmentsTabs';

describe('investments tabs', () => {
  it('lists the six tabs in board order', () => {
    expect(investmentsTabs.map((t) => t.label)).toEqual([
      'Holdings',
      'Tradebook',
      'Dividends',
      'F&O',
      'Corporate actions',
      'Instruments',
    ]);
  });

  it('counts Tradebook, Dividends, F&O and Corporate actions; not Holdings or Instruments', () => {
    expect(investmentsTabs.filter((t) => t.counted).map((t) => t.id)).toEqual(['tradebook', 'dividends', 'fno', 'corporate-actions']);
  });

  it('sends Holdings to Dinero and every other tab to its Legacy page', () => {
    const hrefs = Object.fromEntries(investmentsTabs.map((t) => [t.id, investmentsTabHref(t)]));
    expect(hrefs.holdings).toBe('/ds/investments');
    expect(hrefs.tradebook).toBe('/investments/tradebook');
    expect(hrefs.fno).toBe('/investments/fno');
    expect(hrefs['corporate-actions']).toBe('/investments/corporate-actions');
  });

  it("recognises a holding's own page and no other path", () => {
    expect(holdingHref('i1')).toBe('/ds/investments/i1');
    expect(isHoldingDetailPath('/ds/investments/i1')).toBe(true);
    expect(isHoldingDetailPath('/ds/investments/i1/')).toBe(true);
    expect(isHoldingDetailPath(HOLDINGS_HREF)).toBe(false);
    expect(isHoldingDetailPath('/ds/investments/i1/extra')).toBe(false);
    expect(isHoldingDetailPath(null)).toBe(false);
  });
});
