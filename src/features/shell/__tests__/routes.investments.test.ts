import { describe, expect, it } from 'vitest';

import { getActiveNavItem } from '../navigation';
import { appHref, isBuiltRoute } from '../routes';

describe('Investments routes', () => {
  it('maps Holdings and a holding page to their Dinero pages, keeping the query string', () => {
    expect(appHref('/investments')).toBe('/investments');
    expect(appHref('/investments?type=etf')).toBe('/investments?type=etf');
    expect(appHref('/investments/i1')).toBe('/investments/i1');
    expect(appHref('/investments/i1?tab=trades&page=1')).toBe('/investments/i1?tab=trades&page=1');
    expect(isBuiltRoute('/investments/i1/extra')).toBe(false);
  });

  it('maps every other tab to its Dinero page', () => {
    for (const path of ['tradebook', 'dividends', 'fno', 'corporate-actions', 'instruments']) {
      expect(appHref(`/investments/${path}`)).toBe(`/investments/${path}`);
    }
  });

  it('keeps the Investments nav item active on both layouts', () => {
    for (const path of ['/investments', '/investments/i1', '/investments', '/investments/tradebook']) {
      expect(getActiveNavItem(path), path).toBe('investments');
    }
  });
});
