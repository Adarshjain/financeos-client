import { describe, expect, it } from 'vitest';

import { appHref } from './routes';

describe('Rules tab route', () => {
  it('sends the Legacy rules path to its Dinero page, keeping the query', () => {
    expect(appHref('/rules')).toBe('/transactions/rules');
    expect(appHref('/rules?status=verified&page=2')).toBe('/transactions/rules?status=verified&page=2');
  });

  it('sends the rewards rules page to its Dinero page', () => {
    expect(appHref('/rewards/rules?account=a1')).toBe('/rewards/rules?account=a1');
  });
});
