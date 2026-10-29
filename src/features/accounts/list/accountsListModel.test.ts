import { describe, expect, it } from 'vitest';

import type { Account, BankAccount, Broker, CreditCard, GenericAccount } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import { AccountType } from '@/lib/types';
import { pinClock } from '@/test/pinClock';

import {
  bankRow,
  brokerRow,
  cardRow,
  cardsKpi,
  cardsSubtitle,
  cashKpi,
  closedLine,
  gapLabel,
  groupAccounts,
  investmentsKpi,
  limitUsed,
  nextBillBadge,
  relativeDay,
  rewardsText,
  walletRow,
} from './accountsListModel';

pinClock();

const TODAY = '2026-10-19';

function bank(over: Partial<BankAccount> = {}): BankAccount {
  return { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC', last4: '4521', balance: 1000, ...over };
}
function wallet(over: Partial<GenericAccount> = {}): GenericAccount {
  return { id: 'w1', type: AccountType.GENERIC, name: 'Cash', financialPosition: 'asset', balance: 200, ...over };
}
function broker(over: Partial<Broker> = {}): Broker {
  return { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 5000, cashBalance: 300, ...over };
}
function card(over: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'c1',
    type: AccountType.CREDIT_CARD,
    name: 'Axis Magnus',
    last4: '9911',
    creditLimit: 100000,
    effectiveCreditLimit: 100000,
    balance: -20000,
    ...over,
  };
}
function bill(over: Partial<CardBillResponse> = {}): CardBillResponse {
  return {
    missingDetails: [],
    accountId: 'c1',
    accountName: 'Axis Magnus',
    muted: false,
    paidSource: 'NONE',
    status: 'OPEN',
    ...over,
  };
}

describe('KPI sums', () => {
  const accounts: Account[] = [
    bank({ id: 'b1', balance: 1000 }),
    bank({ id: 'b2', balance: undefined, openingBalance: '500' }),
    bank({ id: 'b3', balance: 9999, closedOn: '2026-01-01' }),
    wallet({ id: 'w1', balance: 200 }),
    wallet({ id: 'w2', balance: 300, excludeFromNetAsset: true }),
    wallet({ id: 'w3', balance: 700, financialPosition: 'liability' }),
    wallet({ id: 'w4', balance: 800, closedOn: '2026-01-01' }),
    broker({ id: 'k1', balance: 5000 }),
    broker({ id: 'k2', balance: 70, closedOn: '2026-01-01' }),
  ];
  const sections = groupAccounts(accounts, TODAY);

  it('cash adds open banks and asset wallets, including excluded ones, never closed or liability', () => {
    const kpi = cashKpi(sections);
    expect(kpi.value).toBe('₹2,000');
    expect(kpi.context).toBe('2 banks · 2 wallets');
  });

  it('uses singular nouns for one bank and one wallet', () => {
    const one = groupAccounts([bank(), wallet()], TODAY);
    expect(cashKpi(one).context).toBe('1 bank · 1 wallet');
  });

  it('investments sums open brokers only', () => {
    expect(investmentsKpi(sections, null).value).toBe('₹5,000');
  });

  it('investments delta is signed with period today, and absent when unknown', () => {
    expect(investmentsKpi(sections, 0.594).delta).toEqual({ value: '+0.59%', period: 'today', direction: 'good' });
    expect(investmentsKpi(sections, -1.2).delta?.value).toBe('−1.20%');
    expect(investmentsKpi(sections, -1.2).delta?.direction).toBe('bad');
    expect(investmentsKpi(sections, null).delta).toBeUndefined();
    expect(investmentsKpi(sections, undefined).delta).toBeUndefined();
  });

  it('cards KPI shows what is owed with utilisation of the compact limit', () => {
    const s = groupAccounts([card({ balance: -20800, creditLimit: 100000, effectiveCreditLimit: 100000 })], TODAY);
    const kpi = cardsKpi(s);
    expect(kpi.value).toBe('₹20,800');
    expect(kpi.context).toBe('20.8% of ₹1L limit');
    const whole = groupAccounts([card({ balance: -20000, creditLimit: 100000, effectiveCreditLimit: 100000 })], TODAY);
    expect(cardsKpi(whole).context).toBe('20% of ₹1L limit');
  });

  it('cards KPI is danger only while something is owed', () => {
    expect(cardsKpi(groupAccounts([card({ balance: -500 })], TODAY)).tone).toBe('danger');
    expect(cardsKpi(groupAccounts([card({ balance: 0 })], TODAY)).tone).toBeUndefined();
  });

  it('cards KPI omits the context line when there is no limit', () => {
    const s = groupAccounts([card({ creditLimit: null, effectiveCreditLimit: null, balance: -500 })], TODAY);
    expect(cardsKpi(s).context).toBeUndefined();
  });
});

describe('bank rows', () => {
  it('carries the bank id, null when absent', () => {
    expect(bankRow(bank({ bank: 'hdfc' }), TODAY).bank).toBe('hdfc');
    expect(bankRow(bank({ bank: null }), TODAY).bank).toBeNull();
    expect(bankRow(bank(), TODAY).bank).toBeNull();
  });

  it('shows Gmail synced when an ingest date is set, Manual otherwise', () => {
    expect(bankRow(bank({ ingestFromDate: '2026-01-01' }), TODAY).synced).toBe(true);
    expect(bankRow(bank({ ingestFromDate: null }), TODAY).synced).toBe(false);
  });

  it('gap badge is absent for null and 0, present with compact amount otherwise', () => {
    expect(gapLabel(null)).toBeNull();
    expect(gapLabel(undefined)).toBeNull();
    expect(gapLabel(0)).toBeNull();
    expect(gapLabel(298962)).toBe('Gap ₹2.99L');
    expect(gapLabel(-5000)).toBe('Gap ₹5,000');
  });

  it('formats balance with two decimals and the statement date', () => {
    const row = bankRow(bank({ balance: 295030.5, lastStatementDate: '2026-09-30' }), TODAY);
    expect(row.balance).toBe('2,95,030.50');
    expect(row.asOf).toBe('Stmt 30 Sep');
    expect(row.phoneSub).toBe('Statement 30 Sep');
  });

  it('shows the last transaction date when it is after the statement', () => {
    const row = bankRow(bank({ lastStatementDate: '2026-09-30', lastTransactionDate: '2026-10-16' }), TODAY);
    expect(row.asOf).toBe('16 Oct');
    expect(row.phoneSub).toBe('As of 16 Oct');
  });

  it('keeps the statement copy when it is the same day or later, or the transaction is in the future', () => {
    const same = bankRow(bank({ lastStatementDate: '2026-09-30', lastTransactionDate: '2026-09-30' }), TODAY);
    expect(same.asOf).toBe('Stmt 30 Sep');
    expect(same.phoneSub).toBe('Statement 30 Sep');
    expect(bankRow(bank({ lastStatementDate: '2026-09-30', lastTransactionDate: '2026-09-01' }), TODAY).asOf).toBe('Stmt 30 Sep');
    expect(bankRow(bank({ lastStatementDate: '2026-09-30', lastTransactionDate: '2026-10-25' }), TODAY).asOf).toBe('Stmt 30 Sep');
  });

  it('uses the last transaction when there is no statement, and nothing when neither', () => {
    expect(bankRow(bank({ lastStatementDate: null, lastTransactionDate: '2026-10-16' }), TODAY).asOf).toBe('16 Oct');
    expect(bankRow(bank({ lastStatementDate: null, lastTransactionDate: null }), TODAY).asOf).toBeNull();
  });

  it('has no as-of text without a statement date', () => {
    const row = bankRow(bank({ lastStatementDate: null }), TODAY);
    expect(row.asOf).toBeNull();
    expect(row.phoneSub).toBeNull();
  });

  it('falls back to the opening balance', () => {
    expect(bankRow(bank({ balance: null, openingBalance: '1500' }), TODAY).balance).toBe('1,500.00');
  });
});

describe('relative day', () => {
  it('names today and yesterday, else null', () => {
    expect(relativeDay('2026-10-18', '2026-10-18')).toBe('today');
    expect(relativeDay('2026-10-17', '2026-10-18')).toBe('yesterday');
    expect(relativeDay('2026-10-16', '2026-10-18')).toBeNull();
    expect(relativeDay('2026-10-19', '2026-10-18')).toBeNull();
  });

  it('reads a timestamp-shaped date by its day', () => {
    expect(relativeDay('2026-10-18T09:30:00Z', '2026-10-18')).toBe('today');
    expect(relativeDay('2026-10-17T23:59:00Z', '2026-10-18')).toBe('yesterday');
  });

  it('finds yesterday across a month and year boundary', () => {
    expect(relativeDay('2026-09-30', '2026-10-01')).toBe('yesterday');
    expect(relativeDay('2025-12-31', '2026-01-01')).toBe('yesterday');
  });

  it('words the bank row as of copy', () => {
    const tx = (d: string) => bankRow(bank({ lastStatementDate: '2026-09-01', lastTransactionDate: d }), TODAY);
    expect(tx(TODAY).asOf).toBe('Today');
    expect(tx(TODAY).phoneSub).toBe('As of today');
    const y = new Date(`${TODAY}T00:00:00Z`);
    y.setUTCDate(y.getUTCDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    expect(tx(yesterday).asOf).toBe('Yesterday');
    expect(tx(yesterday).phoneSub).toBe('As of yesterday');
    const stmt = (d: string) => bankRow(bank({ lastStatementDate: d, lastTransactionDate: null }), TODAY);
    expect(stmt(TODAY).asOf).toBe('Stmt today');
    expect(stmt(TODAY).phoneSub).toBe('Statement today');
    expect(stmt(yesterday).asOf).toBe('Stmt yesterday');
    expect(stmt(yesterday).phoneSub).toBe('Statement yesterday');
  });
});

describe('next bill badge', () => {
  it('has nothing without a bill', () => {
    expect(nextBillBadge(undefined, TODAY)).toBeNull();
  });
  it('overdue is a danger Overdue', () => {
    expect(nextBillBadge(bill({ status: 'OVERDUE' }), TODAY)).toEqual({ tone: 'danger', label: 'Overdue' });
  });
  it('arrived and due within 3 days is a warning countdown', () => {
    expect(nextBillBadge(bill({ daysUntilDue: 3 }), TODAY)).toEqual({ tone: 'warning', label: 'Due in 3 d' });
    expect(nextBillBadge(bill({ daysUntilDue: 0 }), TODAY)).toEqual({ tone: 'warning', label: 'Due today' });
  });
  it('arrived and further out shows the due date', () => {
    expect(nextBillBadge(bill({ daysUntilDue: 6, paymentDueDate: '2026-10-25' }), TODAY)).toEqual({
      tone: 'neutral',
      label: '25 Oct',
    });
  });
  it('awaiting with a late statement is a danger Statement missing', () => {
    const b = bill({ status: 'AWAITING_STATEMENT', nextStatementExpectedOn: '2026-10-10' });
    expect(nextBillBadge(b, TODAY)).toEqual({ tone: 'danger', label: 'Statement missing' });
  });
  it('awaiting otherwise shows the expected statement date, or nothing', () => {
    expect(nextBillBadge(bill({ status: 'PAID', nextStatementExpectedOn: '2026-11-05' }), TODAY)).toEqual({
      tone: 'neutral',
      label: '5 Nov',
    });
    expect(nextBillBadge(bill({ status: 'NO_DUE' }), TODAY)).toBeNull();
  });
});

describe('limit used', () => {
  const at = (pct: number) => limitUsed(card({ utilizationPct: pct }));
  it('is brand below 30', () => {
    expect(at(29.9)?.tone).toBe('brand');
    expect(at(29.9)?.textTone).toBe('ink');
  });
  it('is warning from 30 up to 70', () => {
    expect(at(30)?.tone).toBe('warning');
    expect(at(69.9)?.tone).toBe('warning');
  });
  it('is danger from 70', () => {
    expect(at(70)?.tone).toBe('danger');
    expect(at(70)?.textTone).toBe('danger');
  });
  it('shows the percent to one decimal and the compact limit', () => {
    const used = at(20.8);
    expect(used?.pctLabel).toBe('20.8%');
    expect(used?.limitLabel).toBe('₹1L');
  });
  it('drops a trailing .0 from the percent', () => {
    expect(at(0)?.pctLabel).toBe('0%');
    expect(at(34.3)?.pctLabel).toBe('34.3%');
    expect(at(50)?.pctLabel).toBe('50%');
  });
  it('is null with no limit', () => {
    expect(limitUsed(card({ creditLimit: null, effectiveCreditLimit: null }))).toBeNull();
  });
  it('derives the percent from balance and limit when the server sent none', () => {
    expect(limitUsed(card({ utilizationPct: null, balance: -50000 }))?.pct).toBe(50);
  });
});

describe('rewards text', () => {
  it('shows grouped points when there are points', () => {
    expect(rewardsText({ accountId: 'c1', points: 12450, grossValueInr: 100 })).toBe('12,450 pts');
  });
  it('falls back to the rupee value', () => {
    expect(rewardsText({ accountId: 'c1', points: 0, grossValueInr: 1250 })).toBe('₹1,250');
  });
  it('is a dash with neither or no total', () => {
    expect(rewardsText({ accountId: 'c1', points: 0, grossValueInr: 0 })).toBe('—');
    expect(rewardsText({ accountId: 'c1', points: 0, grossValueInr: null })).toBe('—');
    expect(rewardsText(undefined)).toBe('—');
  });
});

describe('card rows', () => {
  it('shows the shared limit line with the compact pool limit', () => {
    const row = cardRow(
      card({
        limitPool: { id: 'p1', name: 'Axis pool', creditLimit: 300000, owed: 0, available: 0, memberCount: 2, openMemberCount: 2 },
      }),
      undefined,
      undefined,
      TODAY,
    );
    expect(row.sharedLimit).toBe('Shared limit · Axis pool ₹3L');
  });
  it('has no shared limit line without a pool', () => {
    expect(cardRow(card(), undefined, undefined, TODAY).sharedLimit).toBeNull();
  });
  it('carries the bank id, null when absent', () => {
    expect(cardRow(card({ bank: 'axis' }), undefined, undefined, TODAY).bank).toBe('axis');
    expect(cardRow(card({ bank: null }), undefined, undefined, TODAY).bank).toBeNull();
  });
  it('flags a card with no last4 as No active card', () => {
    const row = cardRow(card({ last4: '' }), undefined, undefined, TODAY);
    expect(row.badges).toEqual([{ tone: 'warning', label: 'No active card' }]);
    expect(row.last4).toBeNull();
  });
  it('shows a future closure as Closing, and counts it as open', () => {
    const c = card({ closedOn: '2026-11-30' });
    expect(cardRow(c, undefined, undefined, TODAY).closing).toBe('Closing 30 Nov');
    expect(groupAccounts([c], TODAY).cards.open).toHaveLength(1);
  });
  it('marks Statement missing for the upload action', () => {
    const b = bill({ status: 'AWAITING_STATEMENT', nextStatementExpectedOn: '2026-10-01' });
    expect(cardRow(card(), b, undefined, TODAY).statementMissing).toBe(true);
    expect(cardRow(card(), bill(), undefined, TODAY).statementMissing).toBe(false);
  });
  it('shows outstanding as owed with two decimals', () => {
    expect(cardRow(card({ balance: -84809 }), undefined, undefined, TODAY).outstanding).toBe('84,809.00');
  });
  it('subtitle includes the full limit and card count, and drops the limit part at zero', () => {
    const open = [card({ id: 'a' }), card({ id: 'b' })];
    expect(cardsSubtitle(open)).toBe('Owed today · ₹2,00,000 limit, 2 cards');
    expect(cardsSubtitle([card({ creditLimit: null, effectiveCreditLimit: null })])).toBe(
      'Owed today',
    );
    expect(cardsSubtitle([card()])).toContain('limit, 1 card');
  });
});

describe('brokers and wallets rows', () => {
  it('broker phone line has client id and cash', () => {
    expect(brokerRow(broker({ clientId: 'ZX123' }), TODAY).phoneSub).toBe('ZX123 · cash ₹300');
    expect(brokerRow(broker(), TODAY).phoneSub).toBe('cash ₹300');
  });
  it('wallet flags excluded and liability', () => {
    expect(walletRow(wallet({ excludeFromNetAsset: true }), TODAY).excluded).toBe(true);
    expect(walletRow(wallet({ financialPosition: 'liability' }), TODAY).liability).toBe(true);
    expect(walletRow(wallet(), TODAY)).toMatchObject({ excluded: false, liability: false });
  });
});

describe('closed line', () => {
  it('is null with no closed accounts', () => {
    expect(closedLine([])).toBeNull();
  });
  it('names the single closed account with its date', () => {
    expect(closedLine([{ name: 'Old HDFC', last4: '1234', closedOn: '2025-03-07' }])).toBe(
      'Closed · 1 · Old HDFC ••1234, closed 7 Mar 25',
    );
  });
  it('gives only the count for several', () => {
    expect(closedLine([{ name: 'A' }, { name: 'B' }])).toBe('Closed · 2');
  });
});
