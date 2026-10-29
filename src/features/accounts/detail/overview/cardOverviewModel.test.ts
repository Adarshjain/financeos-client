import { describe, expect, it } from 'vitest';

import type { Cardholder, CreditCard } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import type { RewardReport } from '@/lib/rewards.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { pinClock } from '@/test/pinClock';

import {
  buildCardholders,
  buildConnections,
  buildLimitCycle,
  buildRecentTransactions,
  buildRewards,
  cardHeroFigures,
  meterTone,
} from './cardOverviewModel';
import { daysBetween } from './overviewDatesModel';

pinClock();

const TODAY = '2026-10-13';

const card: CreditCard = {
  id: 'c1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia',
  last4: '7741',
  creditLimit: 300000,
  effectiveCreditLimit: 300000,
  balance: -44319,
  balanceAnchored: true,
};

function bill(over: Partial<CardBillResponse> = {}): CardBillResponse {
  return {
    missingDetails: [],
    accountId: 'c1',
    accountName: 'HDFC Regalia',
    muted: false,
    paidSource: 'NONE',
    status: 'OPEN',
    statementId: 's1',
    periodEnd: '2026-10-05',
    paymentDueDate: '2026-10-25',
    daysUntilDue: 12,
    totalAmountDue: 44319,
    remainingAmount: 44319,
    unbilledAmount: 0,
    nextStatementExpectedOn: '2026-11-05',
    ...over,
  };
}

describe('meterTone', () => {
  it('is brand under 30, amber from 30 and rose from 70', () => {
    expect(meterTone(29.9)).toBe('brand');
    expect(meterTone(30)).toBe('warning');
    expect(meterTone(69.9)).toBe('warning');
    expect(meterTone(70)).toBe('danger');
    expect(meterTone(null)).toBe('brand');
  });
});

describe('daysBetween', () => {
  it('counts calendar days both ways and rejects non-dates', () => {
    expect(daysBetween('2026-10-13', '2026-10-25')).toBe(12);
    expect(daysBetween('2026-10-13', '2026-10-10')).toBe(-3);
    expect(daysBetween('x', '2026-10-10')).toBeNull();
  });
});

describe('buildLimitCycle', () => {
  const summary = { periodEnd: '2026-10-05', history: [] };

  it('builds the three stats for a bill that is due', () => {
    const m = buildLimitCycle(card, summary, bill(), TODAY);
    expect(m.subtitle).toBe('Statement of 5 Oct · next statement 5 Nov');
    expect(m.anchored).toBe(true);
    expect(m.used).toMatchObject({
      value: '₹44,319',
      tone: 'brand',
      caption: 'of ₹3L limit',
    });
    expect(m.cycle).toEqual({ value: '₹0', caption: 'Unbilled since 5 Oct' });
    expect(m.bill).toEqual({ value: '₹44,319', caption: 'Due 25 Oct · 12 days left' });
    expect(m.ownLimit).toBe('₹3,00,000');
    expect(m.pool).toBeNull();
  });

  it('gives the page hero its limit left, bill due and due date', () => {
    const m = buildLimitCycle(card, summary, bill(), TODAY);
    expect(cardHeroFigures(m)).toEqual([
      { label: 'Limit left', value: '₹2,55,681', caption: 'of ₹3L' },
      { label: 'Bill due', value: '₹44,319' },
      { label: 'Due date', value: '25 Oct', caption: '12 days left' },
    ]);
  });

  it('words an overdue and a due-today bill', () => {
    expect(buildLimitCycle(card, summary, bill({ status: 'OVERDUE', daysUntilDue: -3 }), TODAY).bill.caption).toBe(
      'Due 25 Oct · 3 days overdue'
    );
    expect(buildLimitCycle(card, summary, bill({ daysUntilDue: 0 }), TODAY).bill.caption).toBe('Due 25 Oct · today');
    expect(buildLimitCycle(card, summary, bill({ daysUntilDue: 1 }), TODAY).bill.caption).toBe('Due 25 Oct · 1 day left');
  });

  it('shows the paid date and timing when no bill is due', () => {
    const m = buildLimitCycle(
      { ...card, balance: -6224 },
      summary,
      bill({ status: 'PAID', unbilledAmount: 6224, paidMarkedOn: '2026-09-18', paymentDueDate: '2026-09-25' }),
      TODAY
    );
    expect(m.cycle.value).toBe('₹6,224');
    expect(m.bill).toEqual({ value: '₹0', caption: 'Paid 18 Sep · on time' });
  });

  it('calls a payment after the due date late and omits timing when a date is missing', () => {
    const paid = bill({ status: 'PAID', paidMarkedOn: '2026-09-28', paymentDueDate: '2026-09-25' });
    expect(buildLimitCycle(card, summary, paid, TODAY).bill.caption).toBe('Paid 28 Sep · late');
    expect(
      buildLimitCycle(card, summary, { ...paid, paymentDueDate: null }, TODAY).bill.caption
    ).toBe('Paid 28 Sep');
  });

  it('colours the meter by the 30 and 70 rule', () => {
    expect(buildLimitCycle({ ...card, balance: -100000 }, summary, bill(), TODAY).used.tone).toBe('warning');
    expect(buildLimitCycle({ ...card, balance: -250000 }, summary, bill(), TODAY).used.tone).toBe('danger');
  });

  it('shows the shared limit with its own cap, and leaves the own limit out for a pool-only card', () => {
    const limitPool = {
      id: 'p1',
      name: 'HDFC cards',
      creditLimit: 500000,
      owed: 158800,
      available: 341200,
      memberCount: 2,
      openMemberCount: 2,
    };
    const pooled = buildLimitCycle({ ...card, limitPool }, summary, bill(), TODAY);
    expect(pooled.ownLimit).toBeNull();
    expect(pooled.pool).toEqual({
      label: 'Shared limit · HDFC cards',
      value: '₹3,41,200 free of ₹5,00,000',
      sub: 'across 2 cards',
    });

    const poolOnly = buildLimitCycle(
      { ...card, creditLimit: null, effectiveCreditLimit: 500000, limitPool },
      summary,
      bill(),
      TODAY
    );
    expect(poolOnly.ownLimit).toBeNull();
    expect(poolOnly.used.caption).toBe('of ₹5L limit');
  });

  it('says Not set and shows no bar or caption without a limit', () => {
    const m = buildLimitCycle(
      { ...card, creditLimit: null, effectiveCreditLimit: null },
      null,
      null,
      TODAY
    );
    expect(m.ownLimit).toBe('Not set');
    expect(m.used.pct).toBeNull();
    expect(m.used.caption).toBeNull();
    expect(m.subtitle).toBeNull();
    expect(m.cycle.caption).toBe('Unbilled');
  });
});

describe('buildRewards', () => {
  const report = {
    summary: {
      points: 2180,
      milestonesPts: 0,
      cashbackInr: 0,
      pointsValueInr: 1090,
    },
    rules: [
      { ruleId: 'r1', name: 'Base rule', earned: 2180, earnedUnit: 'POINTS', capStatus: null },
      {
        ruleId: 'r2',
        name: '5X dining',
        earned: 0,
        earnedUnit: 'POINTS',
        capStatus: { cap: 5000, used: 0 },
      },
      { ruleId: 'r3', name: 'Fuel', earned: 120, earnedUnit: 'RUPEES', capStatus: { cap: 500, used: 120 } },
    ],
    milestones: [
      {
        milestoneId: 'm1',
        name: 'Annual spend',
        windowStart: '2026-03-15',
        basis: 'SPEND',
        threshold: 400000,
        progress: 83764,
        payoutValue: 10000,
        rewardType: 'POINTS',
        windowEnd: '2027-03-14',
      },
    ],
    cycleFallback: false,
    anniversaryFallback: false,
  } as unknown as RewardReport;
  const window = { from: '2026-03-15', to: '2027-03-14', calendarYear: false };

  it('summarises earnings, rules, caps and the milestone', () => {
    const m = buildRewards(report, window, TODAY);
    expect(m?.subtitle).toBe('Anniversary year 15 Mar → 14 Mar 27');
    expect(m?.earned).toBe('2,180 pts ≈ ₹1,090');
    expect(m?.rules).toEqual([
      { id: 'r1', label: 'Base rule', value: '2,180 pts' },
      { id: 'r2', label: '5X dining', value: '0 of 5,000 pts cap' },
      { id: 'r3', label: 'Fuel', value: '₹120 of ₹500 cap' },
    ]);
    expect(m?.milestones).toEqual([
      {
        id: 'm1',
        label: 'Annual spend',
        pct: 21,
        caption: '₹83,764 of ₹4,00,000 → 10,000 pts · 152 days left',
      },
    ]);
  });

  it('lists one row per milestone, the window containing today', () => {
    const w = (windowStart: string, windowEnd: string, progress: number) => ({
      ...(report.milestones[0] as object),
      windowStart,
      windowEnd,
      progress,
    });
    const many = {
      ...report,
      milestones: [w('2026-09-01', '2026-09-30', 10), w('2026-10-01', '2026-10-31', 20), w('2026-11-01', '2026-11-30', 0)],
    } as unknown as RewardReport;
    const rows = buildRewards(many, window, TODAY)?.milestones;
    expect(rows).toHaveLength(1);
    expect(rows?.[0].caption).toContain('₹20 of ₹4,00,000');
  });

  it('says Calendar year on the fallback window', () => {
    expect(buildRewards(report, { ...window, calendarYear: true }, TODAY)?.subtitle).toBe('Calendar year');
  });

  it('shows a milestone even when the card has no rules', () => {
    const only = { ...report, rules: [] } as unknown as RewardReport;
    expect(buildRewards(only, window, TODAY)?.milestones).toHaveLength(1);
  });

  it.each([
    ['an info tracker', { payoutType: 'INFO_TRACKER', payoutValue: null }, '₹83,764 of ₹4,00,000 · 152 days left'],
    ['a cash payout', { rewardType: 'CASH', payoutValue: 2500 }, '₹83,764 of ₹4,00,000 → ₹2,500 · 152 days left'],
    [
      'a transaction count',
      { basis: 'TXN_COUNT', threshold: 50, progress: 10, minTxnAmount: 500, payoutValue: null },
      '10 of 50 transactions (₹500+ each) · 152 days left',
    ],
    ['an achieved one', { achieved: true, payoutValue: null }, '₹83,764 of ₹4,00,000 · achieved · 152 days left'],
  ] as const)('captions %s', (_name, over, caption) => {
    const r = { ...report, milestones: [{ ...(report.milestones[0] as object), ...over }] } as unknown as RewardReport;
    expect(buildRewards(r, window, TODAY)?.milestones[0].caption).toBe(caption);
  });

  it('is null without rules and milestones, a report or a window', () => {
    expect(buildRewards({ ...report, rules: [], milestones: [] }, window, TODAY)).toBeNull();
    expect(buildRewards(null, window, TODAY)).toBeNull();
    expect(buildRewards(report, null, TODAY)).toBeNull();
  });
});

describe('buildCardholders', () => {
  const primary: Cardholder = {
    id: 'h1',
    accountId: 'c1',
    role: 'PRIMARY',
    personName: 'Arjun Mehta',
    currentLast4: '7741',
    cards: [{ id: 'k1', cardholderId: 'h1', last4: '7741', closedOn: null }],
  };
  const addon: Cardholder = {
    id: 'h2',
    accountId: 'c1',
    role: 'ADDON',
    personName: 'Meera Mehta',
    spendLimit: 75000,
    cards: [{ id: 'k2', cardholderId: 'h2', last4: '7742', closedOn: null }],
  };
  const stats = [
    { cardholderId: 'h1', currentCycleSpend: 0, spendThisYear: 34448, transactionCount: 19, lastUsedOn: '2026-10-12' },
    { cardholderId: 'h2', currentCycleSpend: 4950, spendThisYear: 4952, transactionCount: 4, lastUsedOn: '2026-09-29' },
  ];

  it('lists the primary first with spend stats and the add-on spend limit', () => {
    const m = buildCardholders([addon, primary], stats, TODAY);
    expect(m.subtitle).toBe('2 active plastics');
    expect(m.rows[0]).toMatchObject({
      name: 'Arjun Mehta',
      initials: 'AM',
      role: 'Primary',
      caption: '••7741 · ₹34,448 this year · 19 transactions · last used 12 Oct',
      limitLine: null,
    });
    expect(m.rows[1]).toMatchObject({
      name: 'Meera Mehta',
      role: 'Add-on',
      caption: '••7742 · ₹4,952 this year · 4 transactions · last used 29 Sep',
      limitLine: { text: '6.6% of ₹75,000 spend limit used', tone: 'ink-3' },
    });
  });

  it('colours the spend limit line by the 30 and 70 rule', () => {
    const at = (spend: number) =>
      buildCardholders([addon], [{ ...stats[1], currentCycleSpend: spend }], TODAY).rows[0].limitLine?.tone;
    expect(at(30000)).toBe('warning');
    expect(at(60000)).toBe('danger');
  });

  it('skips closed cardholders and leaves out stats it does not have', () => {
    const closed = { ...addon, closedOn: '2026-01-01' };
    const m = buildCardholders([primary, closed], null, TODAY);
    expect(m.rows).toHaveLength(1);
    expect(m.subtitle).toBe('1 active plastic');
    expect(m.rows[0].caption).toBe('••7741');
  });
});

describe('buildConnections', () => {
  it('describes statements and Gmail alerts with unmatched count', () => {
    expect(
      buildConnections({
        lastStatementDate: '2026-10-05',
        ingestFromDate: '2026-01-01',
        identifierCount: 2,
        lastMatchDate: '2026-10-12',
        unmatchedCount: 3,
      })
    ).toEqual({
      statements: 'PDF upload · last 5 Oct',
      gmail: '2 identifiers · last match 12 Oct · 3 unmatched',
    });
  });

  it('says None yet, and Off when Gmail import is paused', () => {
    expect(
      buildConnections({
        lastStatementDate: null,
        ingestFromDate: null,
        identifierCount: 2,
        lastMatchDate: '2026-10-12',
        unmatchedCount: 0,
      })
    ).toEqual({ statements: 'None yet', gmail: 'Off' });
  });

  it('leaves out what is unknown and says On when nothing else is', () => {
    expect(
      buildConnections({
        lastStatementDate: null,
        ingestFromDate: '2026-01-01',
        identifierCount: null,
        lastMatchDate: null,
        unmatchedCount: null,
      }).gmail
    ).toBe('On');
    expect(
      buildConnections({
        lastStatementDate: null,
        ingestFromDate: '2026-01-01',
        identifierCount: 1,
        lastMatchDate: null,
        unmatchedCount: 0,
      }).gmail
    ).toBe('1 identifier');
  });
});

describe('buildRecentTransactions', () => {
  const base = { accountId: 'c1', source: 'manual', createdAt: '' } as const;
  it('formats debits plain and credits with a plus, with category and balance', () => {
    const rows = buildRecentTransactions([
      { ...base, id: 't1', date: '2026-10-05', amount: 45, description: 'Fuel surcharge waiver', balance: 56681, categories: [] },
      {
        ...base,
        id: 't2',
        date: '2026-10-02',
        amount: -352,
        description: 'Uber',
        categories: [{ id: 'g1', name: 'Transport' }],
      },
      { ...base, id: 't3', date: '2026-10-01', amount: -10, sourcedDescription: 'Raw text' },
      { ...base, id: 't4', date: '2026-10-01', amount: -10 },
    ] as unknown as Transaction[]);
    expect(rows[0]).toMatchObject({ date: '5 Oct', amount: '+45.00', credit: true, balanceLabel: '₹56,681.00', category: null });
    expect(rows[1]).toMatchObject({ amount: '352.00', credit: false, category: 'Transport', balanceLabel: null });
    expect(rows[2].description).toBe('Raw text');
    // A zero amount is not money in.
    expect(buildRecentTransactions([{ ...base, id: 't0', date: '2026-10-01', amount: 0 }] as unknown as Transaction[])[0]).toMatchObject({ credit: false, amount: '0.00' });
    expect(rows[3].description).toBe('—');
  });
});
