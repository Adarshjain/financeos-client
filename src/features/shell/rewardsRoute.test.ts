import { describe, expect, it } from 'vitest';

import { appHref } from './routes';

describe('Rewards routes', () => {
  it('sends the overview and a card page to their Dinero pages, keeping the query', () => {
    expect(appHref('/rewards')).toBe('/rewards');
    expect(appHref('/rewards?account=a1')).toBe('/rewards?account=a1');
    expect(appHref('/rewards/cards/a1')).toBe('/rewards/cards/a1');
  });

  it('sends Earning rules to its Dinero page, keeping the query', () => {
    expect(appHref('/rewards/rules?account=a1')).toBe('/rewards/rules?account=a1');
  });

  it('maps Which card? (the old /rewards/recommend) to its Dinero page', () => {
    expect(appHref('/rewards/recommend')).toBe('/rewards/which-card');
    expect(appHref('/rewards/which-card')).toBe('/rewards/which-card');
  });
});
