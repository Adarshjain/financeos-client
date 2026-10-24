import { describe, expect, it } from 'vitest';

import { appHref } from '../routes';

describe('Rewards routes', () => {
  it('sends the overview and a card page to their Dinero pages, keeping the query', () => {
    expect(appHref('/rewards')).toBe('/ds/rewards');
    expect(appHref('/rewards?account=a1')).toBe('/ds/rewards?account=a1');
    expect(appHref('/rewards/cards/a1')).toBe('/ds/rewards/cards/a1');
  });

  it('sends Earning rules to its Dinero page, keeping the query', () => {
    expect(appHref('/rewards/rules?account=a1')).toBe('/ds/rewards/rules?account=a1');
  });

  it('leaves the pages not built yet on Legacy', () => {
    expect(appHref('/rewards/recommend')).toBe('/rewards/recommend');
  });
});
