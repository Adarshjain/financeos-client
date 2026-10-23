import { describe, expect, it } from 'vitest';

import { activeInvestmentsTab, holdingHref, HOLDINGS_HREF, investmentsTabHref, investmentsTabs, isHoldingDetailPath } from './investmentsTabs';

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

  it('sends every tab to its Dinero page', () => {
    const hrefs = Object.fromEntries(investmentsTabs.map((t) => [t.id, investmentsTabHref(t)]));
    expect(hrefs.holdings).toBe('/ds/investments');
    expect(hrefs.tradebook).toBe('/ds/investments/tradebook');
    expect(hrefs.fno).toBe('/ds/investments/fno');
    expect(hrefs['corporate-actions']).toBe('/ds/investments/corporate-actions');
  });

  it('finds the active tab from the pathname, Holdings for anything else', () => {
    expect(activeInvestmentsTab('/ds/investments')).toBe('holdings');
    expect(activeInvestmentsTab('/ds/investments/')).toBe('holdings');
    expect(activeInvestmentsTab('/ds/investments/dividends')).toBe('dividends');
    expect(activeInvestmentsTab('/ds/investments/corporate-actions/')).toBe('corporate-actions');
    expect(activeInvestmentsTab('/ds/investments/i1')).toBe('holdings');
    expect(activeInvestmentsTab(null)).toBe('holdings');
  });

  it("recognises a holding's own page and no other path", () => {
    expect(holdingHref('i1')).toBe('/ds/investments/i1');
    expect(isHoldingDetailPath('/ds/investments/i1')).toBe(true);
    expect(isHoldingDetailPath('/ds/investments/i1/')).toBe(true);
    expect(isHoldingDetailPath(HOLDINGS_HREF)).toBe(false);
    expect(isHoldingDetailPath('/ds/investments/i1/extra')).toBe(false);
    expect(isHoldingDetailPath(null)).toBe(false);
  });

  it('does not take a tab page for a holding', () => {
    for (const seg of ['tradebook', 'dividends', 'fno', 'corporate-actions', 'instruments']) {
      expect(isHoldingDetailPath(`/ds/investments/${seg}`)).toBe(false);
    }
  });
});
