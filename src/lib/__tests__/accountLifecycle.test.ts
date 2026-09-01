import { describe, expect, it } from 'vitest';

import { Account, getAccountStatus, isAccountClosed, isAccountClosing } from '@/lib/account.types';
import { rewardEligibleAccounts } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

describe('Account lifecycle utilities', () => {
  const activeAccount: Account = {
    id: 'acc1',
    name: 'Active HDFC Bank',
    type: AccountType.BANK_ACCOUNT,
    financialPosition: 'asset',
    closedOn: null,
  } as any;

  const pastClosedAccount: Account = {
    id: 'acc2',
    name: 'Closed ICICI Card',
    type: AccountType.CREDIT_CARD,
    financialPosition: 'liability',
    closedOn: '2020-01-01',
  } as any;

  const futureClosingAccount: Account = {
    id: 'acc3',
    name: 'Closing Axis Bank',
    type: AccountType.BANK_ACCOUNT,
    financialPosition: 'asset',
    closedOn: '2099-12-31',
  } as any;

  const brokerAccount: Account = {
    id: 'acc4',
    name: 'Zerodha Kite',
    type: AccountType.BROKER,
    financialPosition: 'asset',
    closedOn: null,
  } as any;

  it('computes account status accurately based on reference date', () => {
    expect(getAccountStatus(activeAccount)).toBe('ACTIVE');
    expect(getAccountStatus(pastClosedAccount)).toBe('CLOSED');
    expect(getAccountStatus(futureClosingAccount)).toBe('CLOSING');

    expect(isAccountClosed(activeAccount)).toBe(false);
    expect(isAccountClosed(pastClosedAccount)).toBe(true);
    expect(isAccountClosed(futureClosingAccount)).toBe(false);

    expect(isAccountClosing(activeAccount)).toBe(false);
    expect(isAccountClosing(pastClosedAccount)).toBe(false);
    expect(isAccountClosing(futureClosingAccount)).toBe(true);
  });

  it('rewardEligibleAccounts filters out broker accounts and closed accounts by default', () => {
    const all = [brokerAccount, pastClosedAccount, activeAccount];
    const eligible = rewardEligibleAccounts(all);

    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe('acc1');
  });

  it('rewardEligibleAccounts includes closed accounts when requested', () => {
    const all = [brokerAccount, pastClosedAccount, activeAccount];
    const eligible = rewardEligibleAccounts(all, { includeClosed: true });

    expect(eligible).toHaveLength(2);
    expect(eligible.map((a) => a.id)).toContain('acc1');
    expect(eligible.map((a) => a.id)).toContain('acc2');
    expect(eligible.map((a) => a.id)).not.toContain('acc4');
  });
});
