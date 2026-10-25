import { describe, expect, it } from 'vitest';

import { AccountType } from '@/lib/types';

import { trendValues } from './accountTrend';

describe('trendValues', () => {
  it('a card\'s trend is its owed amount: the balances negated', () => {
    expect(trendValues({ type: AccountType.CREDIT_CARD }, [-1500, -1200, 300])).toEqual([1500, 1200, -300]);
  });

  it('any other account keeps its balances', () => {
    expect(trendValues({ type: AccountType.BANK_ACCOUNT }, [1000, 1500])).toEqual([1000, 1500]);
  });
});
