import { describe, expect, it } from 'vitest';

import { getActiveNavItem } from './navigation';
import { appHref, rootRedirectFor } from './routes';

describe('Investments routes', () => {
  it('maps the landing, Holdings and a holding page to their Dinero pages, keeping the query string', () => {
    expect(appHref('/investments')).toBe('/investments');
    expect(appHref('/investments/holdings?type=etf')).toBe('/investments/holdings?type=etf');
    expect(appHref('/investments/i1')).toBe('/investments/i1');
    expect(appHref('/investments/i1?tab=trades&page=1')).toBe('/investments/i1?tab=trades&page=1');
  });

  it('keeps the pages that did not move', () => {
    for (const path of ['holdings', 'epf', 'nps', 'fno', 'instruments', 'import', 'tradebook', 'dividends', 'corporate-actions']) {
      expect(appHref(`/investments/${path}`)).toBe(`/investments/${path}`);
    }
  });

  it('sends the old Retirement addresses to the landing, EPF and NPS, keeping the query', () => {
    expect(appHref('/investments/retirement')).toBe('/investments');
    expect(appHref('/investments/retirement/epf')).toBe('/investments/epf');
    expect(appHref('/investments/retirement/epf?fy=2025')).toBe('/investments/epf?fy=2025');
    expect(appHref('/investments/retirement/nps')).toBe('/investments/nps');
    expect(appHref('/investments/retirement/nps?account=a1')).toBe('/investments/nps?account=a1');
  });

  it('keeps the tab pages at their own addresses, query included', () => {
    expect(appHref('/investments/tradebook?search=INFY')).toBe('/investments/tradebook?search=INFY');
    expect(appHref('/investments/dividends?instrumentId=i1')).toBe('/investments/dividends?instrumentId=i1');
    expect(appHref('/investments/corporate-actions')).toBe('/investments/corporate-actions');
    expect(rootRedirectFor('/investments/tradebook/', '')).toBeNull();
    expect(rootRedirectFor('/investments/dividends', '?fy=2025')).toBeNull();
  });

  it('redirects the old Retirement addresses to their new pages', () => {
    expect(rootRedirectFor('/investments/retirement/epf', '?fy=2025')).toBe('/investments/epf?fy=2025');
    expect(rootRedirectFor('/investments/retirement', '')).toBe('/investments');
    expect(rootRedirectFor('/investments/epf', '?fy=2025')).toBeNull();
  });

  it('keeps the Investments nav item active on both layouts', () => {
    for (const path of ['/investments', '/investments/holdings', '/investments/i1', '/investments/tradebook', '/investments/epf', '/investments/nps', '/investments/instruments']) {
      expect(getActiveNavItem(path), path).toBe('investments');
    }
  });
});
