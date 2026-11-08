import { describe, expect, it } from 'vitest';

import { activeInvestmentsTab, activeInvestmentsView, holdingHref, HOLDINGS_HREF, investmentsTabHref, investmentsTabs } from './investmentsTabs';

describe('investments tabs', () => {
  it('lists the stocks tabs in order, with no Retirement or Activity', () => {
    expect(investmentsTabs.map((t) => t.label)).toEqual(['Holdings', 'Dividends', 'Tradebook', 'F&O', 'Corporate actions']);
  });

  it('carries no counts', () => {
    for (const t of investmentsTabs) expect(t).not.toHaveProperty('counted');
  });

  it('sends every tab to its Dinero page', () => {
    const hrefs = Object.fromEntries(investmentsTabs.map((t) => [t.id, investmentsTabHref(t)]));
    expect(hrefs.holdings).toBe('/investments/holdings');
    expect(hrefs.dividends).toBe('/investments/dividends');
    expect(hrefs.tradebook).toBe('/investments/tradebook');
    expect(hrefs['corporate-actions']).toBe('/investments/corporate-actions');
    expect(hrefs.fno).toBe('/investments/fno');
    expect(HOLDINGS_HREF).toBe('/investments/holdings');
  });

  it('finds the active tab from the pathname, Holdings for anything else', () => {
    expect(activeInvestmentsTab('/investments/holdings')).toBe('holdings');
    expect(activeInvestmentsTab('/investments')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/i1')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/instruments')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/import')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/fno')).toBe('fno');
    expect(activeInvestmentsTab(null)).toBe('holdings');
  });

  it('finds the tab of each page, Holdings for EPF, NPS and the landing', () => {
    expect(activeInvestmentsTab('/investments/dividends')).toBe('dividends');
    expect(activeInvestmentsTab('/investments/tradebook/')).toBe('tradebook');
    expect(activeInvestmentsTab('/investments/corporate-actions')).toBe('corporate-actions');
    expect(activeInvestmentsTab('/investments/epf')).toBe('holdings');
  });

  it('names the screen of a pathname', () => {
    expect(activeInvestmentsView('/investments/dividends')).toBe('dividends');
    expect(activeInvestmentsView('/investments/tradebook')).toBe('tradebook');
    expect(activeInvestmentsView('/investments/corporate-actions')).toBe('corporate-actions');
    expect(activeInvestmentsView('/investments/epf')).toBe('epf');
    expect(activeInvestmentsView('/investments/nps')).toBe('nps');
    expect(activeInvestmentsView('/investments/fno')).toBe('fno');
    expect(activeInvestmentsView('/investments/holdings')).toBe('holdings');
  });

  it('calls the landing the overview', () => {
    expect(activeInvestmentsView('/investments')).toBe('overview');
    expect(activeInvestmentsView('/investments/')).toBe('overview');
  });

  it("builds a holding's own page address", () => {
    expect(holdingHref('i1')).toBe('/investments/i1');
  });
});
