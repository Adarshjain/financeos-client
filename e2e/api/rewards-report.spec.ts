import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createBucket,
  createMilestone,
  createRewardCard,
  createRewardRule,
  fixedMonth,
  lines,
  report,
  spend,
} from '../fixtures/seed/rewards';
import { createTransaction } from '../fixtures/seed/transactions';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Rewards Report and Lines API (@api)', () => {
  // Scenario 1: Percent Rounding
  test('Scenario 1: 2% percent rounding NONE vs FLOOR_RUPEE vs NEAREST_RUPEE on ₹1,234.56', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Rounding Card' });

    // 1. NONE: 2% of 1234.56 = 24.6912 -> 24.69
    const ruleNone = await createRewardRule(api, account.id, {
      name: '2% Rounding NONE',
      accrualType: 'PERCENT',
      percentRate: 2.0,
      rounding: 'NONE',
    });
    const txn1 = await spend(api, account.id, {
      amount: 1234.56,
      date: `${month.from.slice(0, 7)}-05`,
    });
    const repNone = await report(api, account.id, month.from, month.to);
    expect(repNone.summary.grossValueInr).toBe(24.69);

    // Clean up rule & txn to test FLOOR_RUPEE
    await api.DELETE('/api/v1/reward-rules/{id}', { params: { path: { id: ruleNone.id } } });
    await api.DELETE('/api/v1/transactions/{id}', { params: { path: { id: txn1.id } } });

    // 2. FLOOR_RUPEE: 2% of 1234.56 = 24.6912 -> 24.00
    const ruleFloor = await createRewardRule(api, account.id, {
      name: '2% Rounding FLOOR',
      accrualType: 'PERCENT',
      percentRate: 2.0,
      rounding: 'FLOOR_RUPEE',
    });
    const txn2 = await spend(api, account.id, {
      amount: 1234.56,
      date: `${month.from.slice(0, 7)}-05`,
    });
    const repFloor = await report(api, account.id, month.from, month.to);
    expect(repFloor.summary.grossValueInr).toBe(24.0);

    // Clean up
    await api.DELETE('/api/v1/reward-rules/{id}', { params: { path: { id: ruleFloor.id } } });
    await api.DELETE('/api/v1/transactions/{id}', { params: { path: { id: txn2.id } } });

    // 3. NEAREST_RUPEE: 2% of 1234.56 = 24.6912 -> 25.00
    await createRewardRule(api, account.id, {
      name: '2% Rounding NEAREST',
      accrualType: 'PERCENT',
      percentRate: 2.0,
      rounding: 'NEAREST_RUPEE',
    });
    await spend(api, account.id, {
      amount: 1234.56,
      date: `${month.from.slice(0, 7)}-05`,
    });
    const repNearest = await report(api, account.id, month.from, month.to);
    expect(repNearest.summary.grossValueInr).toBe(25.0);
  });

  // Scenario 2: SLAB accrual
  test('Scenario 2: SLAB ₹100 -> 2 pts, spend ₹1,250 -> 24 pts floored at pointPrecision=0', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Slab Card' });

    await createRewardRule(api, account.id, {
      name: 'Slab 100 -> 2 pts',
      rewardType: 'POINTS',
      accrualType: 'SLAB',
      slabSize: 100,
      pointsPerSlab: 2,
      pointPrecision: 0,
    });

    await spend(api, account.id, {
      amount: 1250,
      date: `${month.from.slice(0, 7)}-10`,
    });

    const rep = await report(api, account.id, month.from, month.to);
    expect(rep.summary.points).toBe(24);
  });

  // Scenario 3: Fee Treatment
  test('Scenario 3: Fee treatment EXCLUDE_FEE vs INCLUDE and FEE_ONLY zero line', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Fee Treatment CC' });

    // 1. EXCLUDE_FEE: ₹1000 spend with ₹100 convenienceFee at 2% -> basis ₹900 -> ₹18.00
    const ruleExclude = await createRewardRule(api, account.id, {
      name: '2% EXCLUDE_FEE',
      accrualType: 'PERCENT',
      percentRate: 2.0,
      feeTreatment: 'EXCLUDE_FEE',
    });

    const txn1 = await spend(api, account.id, {
      amount: 1000,
      convenienceFee: 100,
      date: `${month.from.slice(0, 7)}-05`,
    });

    const repExclude = await report(api, account.id, month.from, month.to);
    expect(repExclude.summary.grossValueInr).toBe(18.0);

    // 2. INCLUDE: ₹1000 spend with ₹100 fee at 2% -> basis ₹1000 -> ₹20.00
    await api.DELETE('/api/v1/reward-rules/{id}', { params: { path: { id: ruleExclude.id } } });
    await api.DELETE('/api/v1/transactions/{id}', { params: { path: { id: txn1.id } } });

    await createRewardRule(api, account.id, {
      name: '2% INCLUDE_FEE',
      accrualType: 'PERCENT',
      percentRate: 2.0,
      feeTreatment: 'INCLUDE',
    });

    await spend(api, account.id, {
      amount: 1000,
      convenienceFee: 100,
      date: `${month.from.slice(0, 7)}-05`,
    });

    const repInclude = await report(api, account.id, month.from, month.to);
    expect(repInclude.summary.grossValueInr).toBe(20.0);

    // 3. Fee >= charge with EXCLUDE_FEE -> FEE_ONLY zero line
    await createRewardRule(api, account.id, {
      name: '2% EXCLUDE_FEE for FEE_ONLY',
      priority: 20,
      accrualType: 'PERCENT',
      percentRate: 2.0,
      feeTreatment: 'EXCLUDE_FEE',
    });

    await spend(api, account.id, {
      amount: 50,
      convenienceFee: 50,
      date: `${month.from.slice(0, 7)}-06`,
    });

    const lineRes = await lines(api, account.id, month.from, month.to);
    const feeOnlyLine = lineRes.content.find((l) => l.reason === 'FEE_ONLY');
    expect(feeOnlyLine).toBeDefined();
    expect(feeOnlyLine?.earned).toBe(0);
  });

  // Scenario 4: EXCLUSIVE + FALL_THROUGH + ADDITIVE
  test('Scenario 4: EXCLUSIVE + FALL_THROUGH + ADDITIVE stacks correctly', async ({ api }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Stacking CC' });

    // Rule 1: 5% EXCLUSIVE with periodCap=10, onCapExhausted=FALL_THROUGH, priority 30
    await createRewardRule(api, account.id, {
      name: '5% Capped Fallthrough',
      priority: 30,
      stacking: 'EXCLUSIVE',
      accrualType: 'PERCENT',
      percentRate: 5.0,
      periodCap: 10,
      capWindow: 'CALENDAR_MONTH',
      onCapExhausted: 'FALL_THROUGH',
    });

    // Rule 2: 1% EXCLUSIVE base, priority 20
    await createRewardRule(api, account.id, {
      name: '1% Base',
      priority: 20,
      stacking: 'EXCLUSIVE',
      accrualType: 'PERCENT',
      percentRate: 1.0,
    });

    // Rule 3: 0.5% ADDITIVE, priority 10
    await createRewardRule(api, account.id, {
      name: '0.5% Additive',
      priority: 10,
      stacking: 'ADDITIVE',
      accrualType: 'PERCENT',
      percentRate: 0.5,
    });

    // Spend 1: ₹200 on day 1 -> earns ₹10 on Rule 1 (exhausts ₹10 cap) + ₹1 on Rule 3 = ₹11
    await spend(api, account.id, {
      amount: 200,
      date: `${month.from.slice(0, 7)}-01`,
    });

    // Spend 2: ₹1000 on day 10 -> Rule 1 cap exhausted -> falls through to Rule 2 (1% of 1000 = ₹10) + Rule 3 (0.5% = ₹5) -> ₹15.00
    const txn2 = await spend(api, account.id, {
      amount: 1000,
      date: `${month.from.slice(0, 7)}-10`,
    });

    const linesRes = await lines(api, account.id, month.from, month.to);
    const txn2Lines = linesRes.content.filter((l) => l.transactionId === txn2.id && l.earned > 0);
    expect(txn2Lines.length).toBe(2);
    const totalTxn2 = txn2Lines.reduce((acc, l) => acc + l.earned, 0);
    expect(totalTxn2).toBe(15.0);
  });

  // Scenario 5: STOP on exhausted cap
  test('Scenario 5: STOP on exhausted cap emits CAP_EXHAUSTED zero line without fall-through', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Stop Cap CC' });

    // Rule 1: 5% EXCLUSIVE with periodCap=10, onCapExhausted=STOP, priority 20
    await createRewardRule(api, account.id, {
      name: '5% Stop On Cap',
      priority: 20,
      stacking: 'EXCLUSIVE',
      accrualType: 'PERCENT',
      percentRate: 5.0,
      periodCap: 10,
      capWindow: 'CALENDAR_MONTH',
      onCapExhausted: 'STOP',
    });

    // Rule 2: 1% fallback rule
    await createRewardRule(api, account.id, {
      name: '1% Fallback',
      priority: 10,
      stacking: 'EXCLUSIVE',
      accrualType: 'PERCENT',
      percentRate: 1.0,
    });

    // Prior spend exhausts ₹10 cap
    await spend(api, account.id, {
      amount: 200,
      date: `${month.from.slice(0, 7)}-01`,
    });

    // Second spend: ₹500
    const txn2 = await spend(api, account.id, {
      amount: 500,
      date: `${month.from.slice(0, 7)}-10`,
    });

    const linesRes = await lines(api, account.id, month.from, month.to);
    const txn2Lines = linesRes.content.filter((l) => l.transactionId === txn2.id);
    expect(txn2Lines.length).toBe(1);
    expect(txn2Lines[0].earned).toBe(0);
    expect(txn2Lines[0].reason).toBe('CAP_EXHAUSTED');
  });

  // Scenario 6: perTxnCap
  test('Scenario 6: perTxnCap clamps single line to cap with PARTIAL_CAP', async ({ api }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Per Txn Cap CC' });

    await createRewardRule(api, account.id, {
      name: '10% with ₹100 perTxnCap',
      accrualType: 'PERCENT',
      percentRate: 10.0,
      perTxnCap: 100,
    });

    // ₹5000 at 10% = ₹500 raw -> clamped to ₹100
    const txn = await spend(api, account.id, {
      amount: 5000,
      date: `${month.from.slice(0, 7)}-05`,
    });

    const linesRes = await lines(api, account.id, month.from, month.to);
    const line = linesRes.content.find((l) => l.transactionId === txn.id);
    expect(line).toBeDefined();
    expect(line?.earned).toBe(100);
    expect(line?.reason).toBe('PARTIAL_CAP');
  });

  // Scenario 7: Shared Bucket
  test('Scenario 7: Shared bucket across multiple rules clamps and exhausts', async ({ api }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Shared Bucket CC' });

    const bucket = await createBucket(api, account.id, {
      name: '₹50 Shared Pool',
      cap: 50,
      windowType: 'CALENDAR_MONTH',
      rewardType: 'CASH',
    });

    // Rule A: 10% on Dining MCC 5812
    await createRewardRule(api, account.id, {
      name: 'Dining 10%',
      priority: 20,
      accrualType: 'PERCENT',
      percentRate: 10.0,
      mccs: ['5812'],
      capBucketId: bucket.id,
      onCapExhausted: 'FALL_THROUGH',
    });

    // Rule B: 10% on Grocery MCC 5411
    await createRewardRule(api, account.id, {
      name: 'Grocery 10%',
      priority: 10,
      accrualType: 'PERCENT',
      percentRate: 10.0,
      mccs: ['5411'],
      capBucketId: bucket.id,
      onCapExhausted: 'FALL_THROUGH',
    });

    // Spend 1: ₹400 Dining -> ₹40 earned (bucket used = 40)
    await spend(api, account.id, {
      amount: 400,
      mcc: '5812',
      date: `${month.from.slice(0, 7)}-02`,
    });

    // Spend 2: ₹300 Grocery -> raw ₹30 -> clamped to ₹10 PARTIAL_CAP (bucket used = 50)
    const txn2 = await spend(api, account.id, {
      amount: 300,
      mcc: '5411',
      date: `${month.from.slice(0, 7)}-05`,
    });

    // Spend 3: ₹200 Dining -> raw ₹20 -> 0 earned CAP_EXHAUSTED
    const txn3 = await spend(api, account.id, {
      amount: 200,
      mcc: '5812',
      date: `${month.from.slice(0, 7)}-10`,
    });

    const rep = await report(api, account.id, month.from, month.to);
    expect(rep.summary.grossValueInr).toBe(50.0);
    expect(rep.rules[0].capStatus?.used).toBe(50.0);

    const linesRes = await lines(api, account.id, month.from, month.to);
    const line2 = linesRes.content.find((l) => l.transactionId === txn2.id);
    expect(line2?.earned).toBe(10);
    expect(line2?.reason).toBe('PARTIAL_CAP');

    const line3 = linesRes.content.find((l) => l.transactionId === txn3.id);
    expect(line3?.earned).toBe(0);
    expect(line3?.reason).toBe('CAP_EXHAUSTED');
  });

  // Scenario 8: Tiered Rates
  test('Scenario 8: Tiered rates 5% up to ₹10,000 then 1% yields ₹520 on ₹12,000 across spends', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Tiered CC' });

    await createRewardRule(api, account.id, {
      name: '5% to 10k then 1%',
      accrualType: 'PERCENT',
      tierWindow: 'CALENDAR_MONTH',
      tiers: [
        { upTo: 10000, rate: 5.0 },
        { upTo: null as any, rate: 1.0 },
      ],
    });

    // Spend 1: ₹8,000 -> 8000 @ 5% = ₹400
    await spend(api, account.id, {
      amount: 8000,
      date: `${month.from.slice(0, 7)}-05`,
    });

    // Spend 2: ₹4,000 -> 2000 @ 5% = 100 + 2000 @ 1% = 20 -> ₹120
    await spend(api, account.id, {
      amount: 4000,
      date: `${month.from.slice(0, 7)}-10`,
    });

    const rep = await report(api, account.id, month.from, month.to);
    // Total gross = 400 + 120 = 520.00
    expect(rep.summary.grossValueInr).toBe(520.0);
  });

  // Scenario 9: ANNIVERSARY_YEAR window & fallback
  test('Scenario 9: ANNIVERSARY_YEAR resets across anniversary boundary and falls back when unset', async ({
    api,
  }) => {
    // 1. Anniversary year boundary
    const { account } = await createRewardCard(api, {
      name: 'Anniversary CC',
      anniversaryDate: '2025-06-01',
    });

    await createRewardRule(api, account.id, {
      name: 'Anniversary Capped 10%',
      accrualType: 'PERCENT',
      percentRate: 10.0,
      periodCap: 100,
      capWindow: 'ANNIVERSARY_YEAR',
    });

    // Spend before boundary: 2026-05-20 -> ₹1000 @ 10% = ₹100 (hits cap)
    await spend(api, account.id, {
      amount: 1000,
      date: '2026-05-20',
    });

    // Spend after boundary: 2026-06-05 -> in new anniversary year (2026-06-01 to 2027-05-31) -> earns ₹100 again!
    await spend(api, account.id, {
      amount: 1000,
      date: '2026-06-05',
    });

    const repAnnual = await report(api, account.id, '2026-05-01', '2026-06-30');
    expect(repAnnual.summary.grossValueInr).toBe(200.0);

    // 2. Account without anniversaryDate (Bank Account) -> anniversaryFallback=true
    const noAnivCard = await createBankAccount(api, { name: 'No Aniv Bank' });
    await createRewardRule(api, noAnivCard.id, {
      name: 'Aniv Rule No Card Aniv',
      accrualType: 'PERCENT',
      percentRate: 5.0,
      periodCap: 50,
      capWindow: 'ANNIVERSARY_YEAR',
    });
    await spend(api, noAnivCard.id, {
      amount: 500,
      date: '2026-01-15',
    });
    const repFallback = await report(api, noAnivCard.id, '2026-01-01', '2026-01-31');
    expect(repFallback.anniversaryFallback).toBe(true);
  });

  // Scenario 10: STATEMENT_CYCLE fallback
  test('Scenario 10: STATEMENT_CYCLE with no statement sets cycleFallback=true', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Statement Cycle CC' });

    await createRewardRule(api, account.id, {
      name: 'Statement Cycle 5%',
      accrualType: 'PERCENT',
      percentRate: 5.0,
      periodCap: 100,
      capWindow: 'STATEMENT_CYCLE',
    });

    await spend(api, account.id, {
      amount: 500,
      date: `${month.from.slice(0, 7)}-15`,
    });

    const rep = await report(api, account.id, month.from, month.to);
    expect(rep.cycleFallback).toBe(true);
  });

  // Scenario 11: Milestones
  test('Scenario 11: Milestones SPEND WINDOW_END vs ON_ACHIEVEMENT, TXN_COUNT and eligibility excludes', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Milestone Rules CC' });

    // 1. SPEND ₹10,000 -> ₹500 CASH_VALUE WINDOW_END (attributed to window end)
    await createMilestone(api, account.id, {
      name: 'Monthly 10k Spend Bonus',
      basis: 'SPEND',
      threshold: 10000,
      payoutType: 'CASH_VALUE',
      payoutValue: 500,
      payoutTiming: 'WINDOW_END',
      windowType: 'CALENDAR_MONTH',
    });

    // 2. SPEND ₹5,000 -> ₹250 ON_ACHIEVEMENT (attributed to crossing txn date)
    await createMilestone(api, account.id, {
      name: 'Instant 5k Spend Bonus',
      basis: 'SPEND',
      threshold: 5000,
      payoutType: 'CASH_VALUE',
      payoutValue: 250,
      payoutTiming: 'ON_ACHIEVEMENT',
      windowType: 'CALENDAR_MONTH',
    });

    // 3. TXN_COUNT 3 with minTxnAmount ₹500 -> ₹100
    await createMilestone(api, account.id, {
      name: '3 Swipes Bonus',
      basis: 'TXN_COUNT',
      threshold: 3,
      minTxnAmount: 500,
      payoutType: 'CASH_VALUE',
      payoutValue: 100,
      payoutTiming: 'WINDOW_END',
      windowType: 'CALENDAR_MONTH',
      excludeMccs: ['6540'], // exclude wallet load
    });

    // Transactions:
    // Day 5: ₹3,000 spend
    await spend(api, account.id, {
      amount: 3000,
      date: `${month.from.slice(0, 7)}-05`,
    });
    // Day 10: ₹3,000 spend -> crosses 5k threshold -> Instant 5k bonus achieved on day 10
    await spend(api, account.id, {
      amount: 3000,
      date: `${month.from.slice(0, 7)}-10`,
    });
    // Day 15: ₹5,000 spend -> total spend 11,000 -> crosses 10k threshold
    await spend(api, account.id, {
      amount: 5000,
      date: `${month.from.slice(0, 7)}-15`,
    });

    const rep = await report(api, account.id, month.from, month.to);
    expect(rep.summary.milestonesInr).toBe(850); // 500 + 250 + 100 = 850
    expect(rep.milestones.every((m) => m.achieved)).toBe(true);

    const onAchievementMs = rep.milestones.find((m) => m.name === 'Instant 5k Spend Bonus');
    expect(onAchievementMs?.payoutDate).toBe(`${month.from.slice(0, 7)}-10`);

    const windowEndMs = rep.milestones.find((m) => m.name === 'Monthly 10k Spend Bonus');
    expect(windowEndMs?.payoutDate).toBe(month.to);
  });

  // Scenario 12: Refund link reduces basis
  test('Scenario 12: Refund link reduces basis (₹1,000 spend - ₹200 linked refund at 2% = ₹16.00)', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Refund Basis CC' });

    await createRewardRule(api, account.id, {
      name: '2% Cashback',
      accrualType: 'PERCENT',
      percentRate: 2.0,
    });

    const spendTxn = await spend(api, account.id, {
      amount: 1000,
      date: `${month.from.slice(0, 7)}-05`,
    });

    const refundTxn = await createTransaction(api, account.id, {
      amount: 200, // positive = credit
      date: `${month.from.slice(0, 7)}-10`,
      description: 'Refund 200',
    });

    // Link refund
    const linkRes = await api.POST('/api/v1/transaction-links', {
      body: {
        type: 'REFUND',
        members: [
          { transactionId: spendTxn.id, isAnchor: true },
          { transactionId: refundTxn.id, isAnchor: false },
        ],
      },
    });
    expect(linkRes.response.status).toBe(201);

    const rep = await report(api, account.id, month.from, month.to);
    // Net basis = 800 -> 2% = ₹16.00
    expect(rep.summary.grossValueInr).toBe(16.0);
  });

  // Scenario 13: byCard attribution with 2 cardholders
  test('Scenario 13: byCard appears with 2 cardholders, per-cardholder attribution and cardholder-scoped rule', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account, cards } = await createRewardCard(api, {
      name: 'Multi-Holder CC',
      cardholders: [
        { name: 'Primary Holder', openedOn: '2025-01-01' },
        { name: 'Addon Holder', openedOn: '2025-01-01' },
      ],
    });

    // Rule 1: Account-wide 1% base
    await createRewardRule(api, account.id, {
      name: '1% Base',
      priority: 10,
      accrualType: 'PERCENT',
      percentRate: 1.0,
    });

    // Rule 2: Addon-holder-specific 5% rule
    await createRewardRule(api, account.id, {
      name: '5% Addon Only',
      priority: 20,
      cardholderId: cards[1].cardholderId,
      accrualType: 'PERCENT',
      percentRate: 5.0,
    });

    // Spend on Primary Card (cards[0]): ₹1000 -> matches Rule 1 (1%) = ₹10
    await spend(api, account.id, {
      amount: 1000,
      cardId: cards[0].id,
      date: `${month.from.slice(0, 7)}-05`,
    });

    // Spend on Addon Card (cards[1]): ₹1000 -> matches Rule 2 (5%) = ₹50
    await spend(api, account.id, {
      amount: 1000,
      cardId: cards[1].id,
      date: `${month.from.slice(0, 7)}-06`,
    });

    const rep = await report(api, account.id, month.from, month.to);
    expect(rep.byCard).toBeDefined();
    expect(rep.byCard.length).toBe(2);

    const primaryStat = rep.byCard.find((bc) => bc.cardId === cards[0].cardholderId || bc.cardLabel.includes('Primary') || bc.cardLabel === 'You');
    const addonStat = rep.byCard.find((bc) => bc.cardId === cards[1].cardholderId || bc.cardLabel.includes('Addon'));

    expect(primaryStat?.cashbackInr).toBe(10.0);
    expect(addonStat?.cashbackInr).toBe(50.0);
    expect(rep.summary.grossValueInr).toBe(60.0);
  });

  // Scenario 14: Lines pagination & filters
  test('Scenario 14: Lines size=2 pagination, ruleId filter, reason field and report matching', async ({
    api,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'Lines Pagination CC' });

    const ruleA = await createRewardRule(api, account.id, {
      name: 'Rule A 2%',
      priority: 10,
      accrualType: 'PERCENT',
      percentRate: 2.0,
    });

    // Create 5 spends
    for (let i = 1; i <= 5; i++) {
      await spend(api, account.id, {
        amount: 100 * i,
        date: `${month.from.slice(0, 7)}-0${i}`,
      });
    }

    // 1. Pagination size=2
    const page0 = await lines(api, account.id, month.from, month.to, { page: 0, size: 2 });
    expect(page0.content.length).toBe(2);
    expect(page0.totalElements).toBe(5);
    expect(page0.totalPages).toBe(3);

    const page1 = await lines(api, account.id, month.from, month.to, { page: 1, size: 2 });
    expect(page1.content.length).toBe(2);

    // 2. Filter by ruleId
    const filtered = await lines(api, account.id, month.from, month.to, {
      ruleId: ruleA.id,
      size: 10,
    });
    expect(filtered.content.length).toBe(5);
    expect(filtered.content.every((l) => l.ruleId === ruleA.id)).toBe(true);

    // 3. Report gross equals sum of lines
    const rep = await report(api, account.id, month.from, month.to);
    const totalLinesEarned = filtered.content.reduce((acc, l) => acc + l.earned, 0);
    expect(rep.summary.grossValueInr).toBe(totalLinesEarned);
  });

  // Scenario 15: Tenancy and 401s
  test('Scenario 15: Cross-tenant report/lines rejected with 400 and unauthenticated checks', async ({
    api,
    request,
  }) => {
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'User A Report CC' });
    const { api: apiB } = await secondUser(request, 'user-b-report');

    // Cross-tenant report -> 400 (permission validation error)
    const foreignRepRes = await apiB.GET('/api/v1/rewards/report', {
      params: { query: { accountId: account.id, from: month.from, to: month.to } },
    });
    expect([400, 403, 404]).toContain(foreignRepRes.response.status);

    // Cross-tenant lines -> 400
    const foreignLinesRes = await apiB.GET('/api/v1/rewards/lines', {
      params: { query: { accountId: account.id, from: month.from, to: month.to } },
    });
    expect([400, 403, 404]).toContain(foreignLinesRes.response.status);

    // 401 unauthenticated
    await expectUnauthenticated('GET', `/api/v1/rewards/report?accountId=${account.id}&from=${month.from}&to=${month.to}`);
    await expectUnauthenticated('GET', `/api/v1/rewards/lines?accountId=${account.id}&from=${month.from}&to=${month.to}`);
  });
});
