import { describe, expect, it } from 'vitest';

import type { Account } from '@/lib/account.types';
import { pickRewardsAccount } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

const cards = [
  { id: 'card-a', name: 'Card A', type: AccountType.CREDIT_CARD },
  { id: 'card-b', name: 'Card B', type: AccountType.CREDIT_CARD },
] as Account[];

describe('pickRewardsAccount', () => {
  it('returns the requested card when it is eligible', () => {
    expect(pickRewardsAccount(cards, 'card-b')?.id).toBe('card-b');
  });

  it('falls back to the first card for unknown, missing or repeated params', () => {
    expect(pickRewardsAccount(cards, 'someone-elses')?.id).toBe('card-a');
    expect(pickRewardsAccount(cards, undefined)?.id).toBe('card-a');
    expect(pickRewardsAccount(cards, ['card-b', 'card-a'])?.id).toBe('card-b');
  });

  it('is undefined when there is nothing to pick from', () => {
    expect(pickRewardsAccount([], 'card-a')).toBeUndefined();
  });
});
