import { describe, expect, it } from 'vitest';

import { activeInvestmentsTab, holdingHref, investmentsTabHref, investmentsTabs } from './investmentsTabs';

describe('investments tabs', () => {
  it('lists the seven tabs in owner order', () => {
    expect(investmentsTabs.map((t) => t.label)).toEqual([
      'Holdings',
      'EPF',
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
    expect(hrefs.epf).toBe('/investments/epf');
    expect(hrefs.tradebook).toBe('/investments/tradebook');
    expect(hrefs.fno).toBe('/investments/fno');
    expect(hrefs['corporate-actions']).toBe('/investments/corporate-actions');
  });

  it('finds the active tab from the pathname, Holdings for anything else', () => {
    expect(activeInvestmentsTab('/investments')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/epf')).toBe('epf');
    expect(activeInvestmentsTab('/investments/')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/dividends')).toBe('dividends');
    expect(activeInvestmentsTab('/investments/corporate-actions/')).toBe('corporate-actions');
    expect(activeInvestmentsTab('/investments/i1')).toBe('holdings');
    expect(activeInvestmentsTab(null)).toBe('holdings');
  });

  it("builds a holding's own page address", () => {
    expect(holdingHref('i1')).toBe('/investments/i1');
  });
});
