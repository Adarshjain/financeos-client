import { describe, expect, it } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { accountGroups } from './accountGroups';

const accounts = [
  { id: 'b1', name: 'HDFC Savings', type: 'bank_account' },
  { id: 'c1', name: 'Regalia', type: 'credit_card' },
  { id: 'k1', name: 'Zerodha', type: 'broker' },
  { id: 'w1', name: 'Paytm', type: 'generic' },
  { id: 'b2', name: 'Old bank', type: 'bank_account', closedOn: '2020-01-01' },
] as unknown as Account[];

describe('accountGroups', () => {
  it('groups by type in bank, credit card, wallet, broker order and marks closed accounts', () => {
    const groups = accountGroups(accounts, [AccountType.BROKER, AccountType.GENERIC, AccountType.CREDIT_CARD, AccountType.BANK_ACCOUNT]);
    expect(groups.map((g) => g.name)).toEqual(['Bank', 'Credit card', 'Wallet / cash', 'Broker']);
    expect(groups[0].options.map((o) => [o.label, o.hint])).toEqual([['HDFC Savings', undefined], ['Old bank', 'Closed']]);
  });

  it('keeps only the types asked for and drops empty groups', () => {
    expect(accountGroups(accounts, [AccountType.CREDIT_CARD]).map((g) => g.name)).toEqual(['Credit card']);
    expect(accountGroups([], [AccountType.CREDIT_CARD])).toEqual([]);
  });

  it('builds options with the given mapper', () => {
    const groups = accountGroups(accounts, [AccountType.GENERIC], (a) => ({ value: a.id, label: `[${a.name}]` }));
    expect(groups[0].options).toEqual([{ value: 'w1', label: '[Paytm]' }]);
  });
});
