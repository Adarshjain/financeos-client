import { describe, expect, it } from 'vitest';

import { getActiveNavItem } from './navigation';
import { appHref, rootRedirectFor } from './routes';

describe('Investments routes', () => {
  it('maps Holdings and a holding page to their Dinero pages, keeping the query string', () => {
    expect(appHref('/investments')).toBe('/investments');
    expect(appHref('/investments?type=etf')).toBe('/investments?type=etf');
    expect(appHref('/investments/i1')).toBe('/investments/i1');
    expect(appHref('/investments/i1?tab=trades&page=1')).toBe('/investments/i1?tab=trades&page=1');
  });

  it('keeps the pages that did not move', () => {
    for (const path of ['fno', 'instruments', 'import', 'retirement', 'retirement/epf', 'activity', 'activity/dividends']) {
      expect(appHref(`/investments/${path}`)).toBe(`/investments/${path}`);
    }
  });

  it('sends the old tab addresses to the Retirement and Activity pages, keeping the query', () => {
    expect(appHref('/investments/epf')).toBe('/investments/retirement/epf');
    expect(appHref('/investments/nps')).toBe('/investments/retirement/nps');
    expect(appHref('/investments/nps?account=a1')).toBe('/investments/retirement/nps?account=a1');
    expect(appHref('/investments/tradebook')).toBe('/investments/activity');
    expect(appHref('/investments/tradebook?search=INFY')).toBe('/investments/activity?search=INFY');
    expect(appHref('/investments/dividends')).toBe('/investments/activity/dividends');
    expect(appHref('/investments/dividends?instrumentId=i1')).toBe('/investments/activity/dividends?instrumentId=i1');
    expect(appHref('/investments/corporate-actions')).toBe('/investments/activity/corporate-actions');
  });

  it('redirects a request for an old tab address to the new page', () => {
    expect(rootRedirectFor('/investments/epf', '?fy=2025')).toBe('/investments/retirement/epf?fy=2025');
    expect(rootRedirectFor('/investments/tradebook/', '')).toBe('/investments/activity');
    expect(rootRedirectFor('/investments/activity', '')).toBeNull();
  });

  it('keeps the Investments nav item active on both layouts', () => {
    for (const path of ['/investments', '/investments/i1', '/investments', '/investments/activity', '/investments/retirement/epf', '/investments/instruments']) {
      expect(getActiveNavItem(path), path).toBe('investments');
    }
  });
});
