import { describe, expect, it } from 'vitest';

import { AccountType } from '@/lib/types';

import { accountNeedsBank } from './accountBank';

describe('accountNeedsBank', () => {
  it('needs a bank for bank accounts and credit cards only', () => {
    expect(accountNeedsBank(AccountType.BANK_ACCOUNT)).toBe(true);
    expect(accountNeedsBank(AccountType.CREDIT_CARD)).toBe(true);
    expect(accountNeedsBank(AccountType.BROKER)).toBe(false);
    expect(accountNeedsBank(AccountType.GENERIC)).toBe(false);
  });
});
