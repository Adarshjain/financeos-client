import { describe, expect, it } from 'vitest';

import { appHref } from '../routes';

describe('Categories tab route', () => {
  it('sends the Legacy categories path to its Dinero page, keeping the query', () => {
    expect(appHref('/rules/categories')).toBe('/ds/transactions/categories');
    expect(appHref('/rules/categories?q=din')).toBe('/ds/transactions/categories?q=din');
  });
});
