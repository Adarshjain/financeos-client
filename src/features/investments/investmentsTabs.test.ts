import { describe, expect, it } from 'vitest';

import { activeInvestmentsTab, holdingHref, HOLDINGS_HREF, investmentsTabHref, investmentsTabs, isHoldingDetailPath } from './investmentsTabs';

describe('investments tabs', () => {
  it('lists the six tabs in owner order', () => {
    expect(investmentsTabs.map((t) => t.label)).toEqual([
      'Holdings',
      'Dividends',
      'Tradebook',
      'F&O',
      'Corporate actions',
      'Instruments',
    ]);
  });

  it('carries no counts', () => {
    for (const t of investmentsTabs) expect(t).not.toHaveProperty('counted');
  });

  it('sends every tab to its Dinero page', () => {
    const hrefs = Object.fromEntries(investmentsTabs.map((t) => [t.id, investmentsTabHref(t)]));
    expect(hrefs.holdings).toBe('/investments');
    expect(hrefs.tradebook).toBe('/investments/tradebook');
    expect(hrefs.fno).toBe('/investments/fno');
    expect(hrefs['corporate-actions']).toBe('/investments/corporate-actions');
  });

  it('finds the active tab from the pathname, Holdings for anything else', () => {
    expect(activeInvestmentsTab('/investments')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/dividends')).toBe('dividends');
    expect(activeInvestmentsTab('/investments/corporate-actions/')).toBe('corporate-actions');
    expect(activeInvestmentsTab('/investments/i1')).toBe('holdings');
    expect(activeInvestmentsTab(null)).toBe('holdings');
  });

  it("recognises a holding's own page and no other path", () => {
    expect(holdingHref('i1')).toBe('/investments/i1');
    expect(isHoldingDetailPath('/investments/i1')).toBe(true);
    expect(isHoldingDetailPath('/investments/i1/')).toBe(true);
    expect(isHoldingDetailPath(HOLDINGS_HREF)).toBe(false);
    expect(isHoldingDetailPath('/investments/i1/extra')).toBe(false);
    expect(isHoldingDetailPath(null)).toBe(false);
  });

  it('does not take a tab page for a holding', () => {
    for (const seg of ['tradebook', 'dividends', 'fno', 'corporate-actions', 'instruments']) {
      expect(isHoldingDetailPath(`/investments/${seg}`)).toBe(false);
    }
  });
});
