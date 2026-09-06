import {
  createMilestone,
  createRewardCard,
  createRewardRule,
  fixedMonth,
  recommend,
  setRewardConfig,
  spend,
} from '../fixtures/seed/rewards';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Reward Recommendations API (@api)', () => {
  test('cap flip ranking: Card B (1.5% flat ₹15) ranks #1 above Card A (5% capped at ₹10)', async ({
    api,
  }) => {
    const month = fixedMonth();
    const evalDate = `${month.from.slice(0, 7)}-15`;

    const { account: cardA } = await createRewardCard(api, { name: 'Card A Capped' });
    const { account: cardB } = await createRewardCard(api, { name: 'Card B Flat' });

    // Card A: 5% EXCLUSIVE with periodCap = ₹10 (CALENDAR_MONTH)
    await createRewardRule(api, cardA.id, {
      name: '5% Capped at 10',
      accrualType: 'PERCENT',
      percentRate: 5.0,
      periodCap: 10,
      capWindow: 'CALENDAR_MONTH',
    });

    // Card B: 1.5% flat EXCLUSIVE
    await createRewardRule(api, cardB.id, {
      name: '1.5% Flat',
      accrualType: 'PERCENT',
      percentRate: 1.5,
    });

    const res = await recommend(api, {
      amount: 1000,
      date: evalDate,
      accountIds: [cardA.id, cardB.id],
    });

    expect(res.recommendations.length).toBe(2);
    // Card B ranks #1 with ₹15.00
    expect(res.recommendations[0].accountId).toBe(cardB.id);
    expect(res.recommendations[0].rank).toBe(1);
    expect(res.recommendations[0].totalValueInr).toBe(15.0);

    // Card A ranks #2 with ₹10.00 and PARTIAL_CAP
    expect(res.recommendations[1].accountId).toBe(cardA.id);
    expect(res.recommendations[1].rank).toBe(2);
    expect(res.recommendations[1].totalValueInr).toBe(10.0);
    expect(res.recommendations[1].ruleLines[0].reason).toBe('PARTIAL_CAP');
  });

  test('cap status headroom reflects real prior spend (Fix S2)', async ({ api }) => {
    const month = fixedMonth();
    const evalDate = `${month.from.slice(0, 7)}-15`;

    const { account } = await createRewardCard(api, { name: 'Headroom CC' });

    await createRewardRule(api, account.id, {
      name: '5% Capped ₹20',
      accrualType: 'PERCENT',
      percentRate: 5.0,
      periodCap: 20,
      capWindow: 'CALENDAR_MONTH',
    });

    // Prior spend: ₹100 @ 5% = ₹5 earned earlier this month
    await spend(api, account.id, {
      amount: 100,
      date: `${month.from.slice(0, 7)}-05`,
    });

    const res = await recommend(api, {
      amount: 1000,
      date: evalDate,
      accountIds: [account.id],
    });

    const rec = res.recommendations.find((r) => r.accountId === account.id);
    expect(rec).toBeDefined();
    const capStatus = rec?.ruleLines[0]?.capStatus;
    expect(capStatus).toBeDefined();
    expect(capStatus?.totalCap).toBe(20);
    expect(capStatus?.usedBefore).toBe(5);
    expect(capStatus?.capRemainingBefore).toBe(15);
  });

  test('points valuation: CONFIG (0.50 -> ₹50) vs DEFAULT (0.25 -> ₹25) with pointsValued and pointValueSource', async ({
    api,
  }) => {
    const month = fixedMonth();
    const evalDate = `${month.from.slice(0, 7)}-15`;

    const { account: cardConfig } = await createRewardCard(api, { name: 'Card Config Points' });
    const { account: cardDefault } = await createRewardCard(api, { name: 'Card Default Points' });

    // Set config on cardConfig
    await setRewardConfig(api, cardConfig.id, { pointValueInr: 0.5 });

    // 100 points per ₹1000 spend (accrualType SLAB 1000 -> 100 pts)
    await createRewardRule(api, cardConfig.id, {
      name: '100 pts per 1000',
      rewardType: 'POINTS',
      accrualType: 'SLAB',
      slabSize: 1000,
      pointsPerSlab: 100,
    });

    await createRewardRule(api, cardDefault.id, {
      name: '100 pts per 1000',
      rewardType: 'POINTS',
      accrualType: 'SLAB',
      slabSize: 1000,
      pointsPerSlab: 100,
    });

    const res = await recommend(api, {
      amount: 1000,
      date: evalDate,
      accountIds: [cardConfig.id, cardDefault.id],
    });

    const recConfig = res.recommendations.find((r) => r.accountId === cardConfig.id);
    const recDefault = res.recommendations.find((r) => r.accountId === cardDefault.id);

    expect(recConfig?.pointValueSource).toBe('CONFIG');
    expect(recConfig?.pointsValued).toBe(true);
    expect(recConfig?.totalValueInr).toBe(50.0);

    expect(recDefault?.pointValueSource).toBe('DEFAULT');
    expect(recDefault?.pointsValued).toBe(true);
    expect(recDefault?.totalValueInr).toBe(25.0);
  });

  test('milestone proximity: full score on crossing vs fractional score before crossing', async ({
    api,
  }) => {
    const month = fixedMonth();
    const evalDate = `${month.from.slice(0, 7)}-15`;

    const { account: cardCrossing } = await createRewardCard(api, { name: 'Crossing Card' });
    const { account: cardFractional } = await createRewardCard(api, { name: 'Fractional Card' });

    // Both cards have a milestone: Spend ₹10,000 -> ₹500 payout
    await createMilestone(api, cardCrossing.id, {
      name: '10k Milestone',
      basis: 'SPEND',
      threshold: 10000,
      payoutType: 'CASH_VALUE',
      payoutValue: 500,
      windowType: 'CALENDAR_MONTH',
    });

    await createMilestone(api, cardFractional.id, {
      name: '10k Milestone',
      basis: 'SPEND',
      threshold: 10000,
      payoutType: 'CASH_VALUE',
      payoutValue: 500,
      windowType: 'CALENDAR_MONTH',
    });

    // Prior spend of ₹8,000 on both
    await spend(api, cardCrossing.id, { amount: 8000, date: `${month.from.slice(0, 7)}-05` });
    await spend(api, cardFractional.id, { amount: 8000, date: `${month.from.slice(0, 7)}-05` });

    // 1. Proposed swipe ₹3,000 on Crossing Card -> total 11,000 >= 10,000 -> crosses = true, scoredValueInr = 500
    const resCrossing = await recommend(api, {
      amount: 3000,
      date: evalDate,
      accountIds: [cardCrossing.id],
    });
    const recCross = resCrossing.recommendations[0];
    expect(recCross.milestones[0].crosses).toBe(true);
    expect(recCross.milestones[0].scoredValueInr).toBe(500);

    // 2. Proposed swipe ₹1,000 on Fractional Card -> delta ₹1,000 / ₹10,000 * ₹500 = ₹50 scoredValueInr
    const resFractional = await recommend(api, {
      amount: 1000,
      date: evalDate,
      accountIds: [cardFractional.id],
    });
    const recFrac = resFractional.recommendations[0];
    expect(recFrac.milestones[0].crosses).toBe(false);
    expect(recFrac.milestones[0].scoredValueInr).toBe(50);
  });

  test('candidate filtering, foreign accountIds, bare card noRulesConfigured and amount validation', async ({
    api,
    request,
  }) => {
    const { account: bareCard } = await createRewardCard(api, { name: 'Bare Credit Card' });
    const { api: apiB } = await secondUser(request, 'user-b-rec');
    const { account: foreignCard } = await createRewardCard(apiB, { name: 'User B CC' });

    // 1. Bare credit card has noRulesConfigured = true
    const res = await recommend(api, {
      amount: 1000,
      accountIds: [bareCard.id],
    });
    expect(res.recommendations[0].noRulesConfigured).toBe(true);
    expect(res.recommendations[0].totalValueInr).toBe(0);

    // 2. Foreign accountIds -> 400
    const foreignRes = await api.POST('/api/v1/reward-recommendations', {
      body: {
        amount: 1000,
        accountIds: [foreignCard.id],
      },
    });
    expect(foreignRes.response.status).toBe(400);

    // 3. Amount <= 0 -> 400
    const zeroAmountRes = await api.POST('/api/v1/reward-recommendations', {
      body: { amount: 0 },
    });
    expect(zeroAmountRes.response.status).toBe(400);

    const negAmountRes = await api.POST('/api/v1/reward-recommendations', {
      body: { amount: -500 },
    });
    expect(negAmountRes.response.status).toBe(400);

    // 4. 401 unauthenticated
    await expectUnauthenticated('POST', '/api/v1/reward-recommendations', { amount: 1000 });
  });
});
