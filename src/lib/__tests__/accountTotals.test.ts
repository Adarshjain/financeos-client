import { describe, expect, it } from 'vitest';

import { sumBalances } from '@/lib/accountTotals';

describe('sumBalances', () => {
  it('adds the balances up, negatives included', () => {
    expect(sumBalances([{ balance: 100 }, { balance: -40.5 }, { balance: 0 }])).toBe(59.5);
  });

  it('counts the opening balance of an account with no calculated balance, numeric or as the API strings it', () => {
    expect(sumBalances([{ balance: null, openingBalance: '250.50' }, { openingBalance: 10 }])).toBe(260.5);
  });

  it('prefers the calculated balance over the opening balance', () => {
    expect(sumBalances([{ balance: 5, openingBalance: '1000' }])).toBe(5);
  });

  it('counts nothing for an account with neither, or an unreadable opening balance', () => {
    expect(sumBalances([{}, { balance: null, openingBalance: 'abc' }, { balance: undefined, openingBalance: '' }])).toBe(0);
  });

  it('is zero for no accounts', () => {
    expect(sumBalances([])).toBe(0);
  });
});
