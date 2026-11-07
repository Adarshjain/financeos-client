import { describe, expect, it } from 'vitest';

import { activeActivityChoice, activeInvestmentsTab, activeInvestmentsView, holdingHref, investmentsTabHref, investmentsTabs } from './investmentsTabs';

describe('investments tabs', () => {
  it('lists the four tabs in order', () => {
    expect(investmentsTabs.map((t) => t.label)).toEqual(['Holdings', 'Retirement', 'Activity', 'F&O']);
  });

  it('carries no counts', () => {
    for (const t of investmentsTabs) expect(t).not.toHaveProperty('counted');
  });

  it('sends every tab to its Dinero page', () => {
    const hrefs = Object.fromEntries(investmentsTabs.map((t) => [t.id, investmentsTabHref(t)]));
    expect(hrefs.holdings).toBe('/investments');
    expect(hrefs.retirement).toBe('/investments/retirement');
    expect(hrefs.activity).toBe('/investments/activity');
    expect(hrefs.fno).toBe('/investments/fno');
  });

  it('finds the active tab from the pathname, Holdings for anything else', () => {
    expect(activeInvestmentsTab('/investments')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/i1')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/instruments')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/import')).toBe('holdings');
    expect(activeInvestmentsTab('/investments/fno')).toBe('fno');
    expect(activeInvestmentsTab(null)).toBe('holdings');
  });

  it('lights Retirement on every path under /investments/retirement and Activity under /investments/activity', () => {
    expect(activeInvestmentsTab('/investments/retirement')).toBe('retirement');
    expect(activeInvestmentsTab('/investments/retirement/')).toBe('retirement');
    expect(activeInvestmentsTab('/investments/retirement/epf')).toBe('retirement');
    expect(activeInvestmentsTab('/investments/retirement/nps')).toBe('retirement');
    expect(activeInvestmentsTab('/investments/activity')).toBe('activity');
    expect(activeInvestmentsTab('/investments/activity/dividends')).toBe('activity');
    expect(activeInvestmentsTab('/investments/activity/corporate-actions/')).toBe('activity');
  });

  it('names the Activity choice and the screen of a pathname', () => {
    expect(activeActivityChoice('/investments/activity')).toBe('trades');
    expect(activeActivityChoice('/investments/activity/dividends')).toBe('dividends');
    expect(activeActivityChoice('/investments/activity/corporate-actions')).toBe('corporate-actions');
    expect(activeInvestmentsView('/investments/activity/dividends')).toBe('dividends');
    expect(activeInvestmentsView('/investments/activity')).toBe('trades');
    expect(activeInvestmentsView('/investments/retirement')).toBe('retirement');
    expect(activeInvestmentsView('/investments/retirement/epf')).toBe('epf');
    expect(activeInvestmentsView('/investments/retirement/nps')).toBe('nps');
    expect(activeInvestmentsView('/investments')).toBe('holdings');
  });

  it("builds a holding's own page address", () => {
    expect(holdingHref('i1')).toBe('/investments/i1');
  });
});
