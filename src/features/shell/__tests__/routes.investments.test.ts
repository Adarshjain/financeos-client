import { describe, expect, it } from 'vitest';

import { getActiveNavItem } from '../navigation';
import { appHref, isBuiltRoute } from '../routes';

describe('Investments routes', () => {
  it('maps Holdings and a holding page to their Dinero pages, keeping the query string', () => {
    expect(appHref('/investments')).toBe('/ds/investments');
    expect(appHref('/investments?type=etf')).toBe('/ds/investments?type=etf');
    expect(appHref('/investments/i1')).toBe('/ds/investments/i1');
    expect(appHref('/investments/i1?tab=trades&page=1')).toBe('/ds/investments/i1?tab=trades&page=1');
    expect(isBuiltRoute('/investments/i1/extra')).toBe(false);
  });

  it('leaves the other tabs on their Legacy pages until their step lands', () => {
    for (const path of ['tradebook', 'dividends', 'fno', 'corporate-actions', 'instruments']) {
      expect(appHref(`/investments/${path}`)).toBe(`/investments/${path}`);
    }
  });

  it('keeps the Investments nav item active on both layouts', () => {
    for (const path of ['/ds/investments', '/ds/investments/i1', '/investments', '/investments/tradebook']) {
      expect(getActiveNavItem(path), path).toBe('investments');
    }
  });
});
