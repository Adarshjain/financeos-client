import { describe, expect, it } from 'vitest';

import type { Account, CreditCard, CreditLimitPool } from '@/lib/account.types';
import { distinctLimitPools, sumCreditLimits, sumCreditUsage } from '@/lib/creditLimitPools';
import { AccountType } from '@/lib/types';

const pool = (id: string, creditLimit: number): CreditLimitPool => ({
  id,
  name: `Pool ${id}`,
  creditLimit,
  owed: 0,
  available: creditLimit,
  utilizationPct: 0,
  memberCount: 2,
  openMemberCount: 2,
});

const card = (id: string, extra: Partial<CreditCard>): CreditCard =>
  ({ id, name: id, type: AccountType.CREDIT_CARD, last4: '1234', creditLimit: null, ...extra }) as CreditCard;

describe('distinctLimitPools', () => {
  it('returns each pool once in first-seen order and skips unpooled cards and other account types', () => {
    const hdfc = pool('hdfc', 500000);
    const icici = pool('icici', 300000);
    const accounts = [
      card('a', { limitPool: hdfc }),
      card('solo', { creditLimit: 100000, limitPool: null }),
      { id: 'bank', name: 'Bank', type: AccountType.BANK_ACCOUNT } as Account,
      card('b', { limitPool: icici }),
      card('c', { limitPool: hdfc }),
    ];

    expect(distinctLimitPools(accounts).map((p) => p.id)).toEqual(['hdfc', 'icici']);
  });

  it('is empty when no card is pooled', () => {
    expect(distinctLimitPools([card('solo', { creditLimit: 1 })])).toEqual([]);
  });
});

describe('sumCreditLimits', () => {
  it('counts a shared limit once however many cards draw on it, plus each unpooled card', () => {
    const hdfc = pool('hdfc', 500000);
    const cards = [
      card('a', { limitPool: hdfc, effectiveCreditLimit: 500000 }),
      card('b', { limitPool: hdfc, effectiveCreditLimit: 500000, creditLimit: 100000 }),
      card('solo', { creditLimit: 100000, effectiveCreditLimit: 100000 }),
    ];

    expect(sumCreditLimits(cards)).toBe(600000);
  });

  it('counts two pools separately', () => {
    expect(
      sumCreditLimits([card('a', { limitPool: pool('x', 100000) }), card('b', { limitPool: pool('y', 200000) })])
    ).toBe(300000);
  });

  it('an unpooled card uses its effective limit, else its own, else nothing', () => {
    expect(
      sumCreditLimits([
        card('statement', { creditLimit: 0, effectiveCreditLimit: 50000 }),
        card('old-payload', { creditLimit: 20000 }),
        card('none', { creditLimit: null, effectiveCreditLimit: null }),
      ])
    ).toBe(70000);
  });

  it('is zero for no cards', () => {
    expect(sumCreditLimits([])).toBe(0);
  });
});

describe('sumCreditUsage', () => {
  const owing = (p: CreditLimitPool, owed: number): CreditLimitPool => ({ ...p, owed });

  it("counts a shared limit's owed once, plus each unpooled card's negative balance", () => {
    const hdfc = owing(pool('hdfc', 500000), 120000);
    const usage = sumCreditUsage([
      card('a', { limitPool: hdfc, balance: -100000 }),
      card('b', { limitPool: hdfc, balance: -20000 }),
      card('solo', { creditLimit: 100000, effectiveCreditLimit: 100000, balance: -30000 }),
    ]);

    expect(usage).toEqual({ limit: 600000, owed: 150000, utilizationPct: 25 });
  });

  it('a card in credit or with no balance owes nothing', () => {
    expect(
      sumCreditUsage([
        card('credit', { creditLimit: 100000, balance: 5000 }),
        card('unknown', { creditLimit: 100000, balance: null }),
      ])
    ).toEqual({ limit: 200000, owed: 0, utilizationPct: 0 });
  });

  it("a card with no limit adds to owed but not to the utilisation", () => {
    expect(
      sumCreditUsage([
        card('limited', { creditLimit: 100000, balance: -10000 }),
        card('no-limit', { creditLimit: null, effectiveCreditLimit: null, balance: -40000 }),
      ])
    ).toEqual({ limit: 100000, owed: 50000, utilizationPct: 10 });
  });

  it('has no utilisation when no card has a limit', () => {
    expect(sumCreditUsage([card('none', { creditLimit: null, balance: -1000 })])).toEqual({
      limit: 0,
      owed: 1000,
      utilizationPct: null,
    });
    expect(sumCreditUsage([])).toEqual({ limit: 0, owed: 0, utilizationPct: null });
  });
});
