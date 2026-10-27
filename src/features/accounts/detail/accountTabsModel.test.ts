import { describe, expect, it } from 'vitest';

import { AccountType } from '@/lib/types';

import { accountTabsFor, activeTabId } from './accountTabsModel';

describe('accountTabsFor', () => {
  it('gives cards and banks four tabs', () => {
    const ids = ['overview', 'statements', 'cards', 'rewards'];
    expect(accountTabsFor(AccountType.CREDIT_CARD).map((t) => t.id)).toEqual(ids);
    expect(accountTabsFor(AccountType.BANK_ACCOUNT).map((t) => t.id)).toEqual(ids);
  });

  it('gives wallets and cash Overview and Rewards, and brokers none', () => {
    expect(accountTabsFor(AccountType.GENERIC).map((t) => t.id)).toEqual(['overview', 'rewards']);
    expect(accountTabsFor(AccountType.BROKER)).toEqual([]);
  });
});

describe('activeTabId', () => {
  it('reads the tab from the pathname', () => {
    expect(activeTabId('/accounts/a1', 'a1')).toBe('overview');
    expect(activeTabId('/accounts/a1/statements', 'a1')).toBe('statements');
    expect(activeTabId('/accounts/a1/cards', 'a1')).toBe('cards');
    expect(activeTabId('/accounts/a1/rewards', 'a1')).toBe('rewards');
  });

  it('keeps a sub-route on its tab and an unknown one on Overview', () => {
    expect(activeTabId('/accounts/a1/statements/s9', 'a1')).toBe('statements');
    expect(activeTabId('/accounts/a1/other', 'a1')).toBe('overview');
  });
});
