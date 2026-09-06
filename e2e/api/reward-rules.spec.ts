import { ensurePrimaryCardholder } from '../fixtures/seed/accounts';
import { createRewardCard, createRewardRule } from '../fixtures/seed/rewards';
import { createCategory } from '../fixtures/seed/transactions';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Reward Rules API (@api)', () => {
  test('reward rule CRUD with rich predicates and points round-trip', async ({ api }) => {
    const { account } = await createRewardCard(api, { name: 'Rule Predicates CC' });
    const cat1 = await createCategory(api, 'Dining Category');
    const cat2 = await createCategory(api, 'Travel Category');

    // 1. Create rule with full predicate set and POINTS rewardType
    const created = await createRewardRule(api, account.id, {
      name: 'Dining & Flights Multiplier',
      priority: 15,
      stacking: 'EXCLUSIVE',
      rewardType: 'POINTS',
      accrualType: 'SLAB',
      slabSize: 100,
      pointsPerSlab: 5,
      pointPrecision: 0,
      activeFrom: '2025-01-01',
      activeTo: '2027-12-31',
      categoryIds: [cat1.id, cat2.id],
      mccs: ['5812', '5814', '3000'],
      channels: ['ONLINE', 'POS'],
      daysOfWeek: ['FRIDAY', 'SATURDAY', 'SUNDAY'],
      merchantPattern: 'SWIGGY|ZOMATO|INDIGO',
      merchantMatch: 'REGEX',
      minAmount: 100,
      maxAmount: 50000,
      emiTreatment: 'EXCLUDE_EMI',
      intlTreatment: 'INCLUDE',
      feeTreatment: 'EXCLUDE_FEE',
      counterScope: 'ACCOUNT',
      perTxnCap: 1000,
      periodCap: 5000,
      capWindow: 'CALENDAR_MONTH',
      onCapExhausted: 'FALL_THROUGH',
    });

    expect(created.id).toBeDefined();
    expect(created.rewardType).toBe('POINTS');
    expect(created.accrualType).toBe('SLAB');
    expect(created.pointsPerSlab).toBe(5);
    expect(created.categories.length).toBe(2);
    expect(created.mccs).toEqual(['3000', '5812', '5814']);
    expect(created.channels).toEqual(['ONLINE', 'POS']);
    expect(created.daysOfWeek).toEqual(['FRIDAY', 'SATURDAY', 'SUNDAY']);
    expect(created.merchantPattern).toBe('SWIGGY|ZOMATO|INDIGO');
    expect(created.merchantMatch).toBe('REGEX');
    expect(created.feeTreatment).toBe('EXCLUDE_FEE');
    expect(created.perTxnCap).toBe(1000);
    expect(created.periodCap).toBe(5000);

    // 2. List rules for account
    const listRes = await api.GET('/api/v1/reward-rules', {
      params: { query: { accountId: account.id } },
    });
    expect(listRes.response.status).toBe(200);
    expect(listRes.data?.some((r) => r.id === created.id)).toBe(true);

    // 3. Update rule: switch to PERCENT CASH rule
    const updateRes = await api.PUT('/api/v1/reward-rules/{id}', {
      params: { path: { id: created.id } },
      body: {
        accountId: account.id,
        name: 'Dining & Flights 3% Cashback',
        priority: 20,
        stacking: 'EXCLUSIVE',
        rewardType: 'CASH',
        accrualType: 'PERCENT',
        percentRate: 3.0,
        rounding: 'FLOOR_RUPEE',
        feeTreatment: 'INCLUDE',
      },
    });
    expect(updateRes.response.status).toBe(200);
    expect(updateRes.data?.name).toBe('Dining & Flights 3% Cashback');
    expect(updateRes.data?.rewardType).toBe('CASH');
    expect(updateRes.data?.percentRate).toBe(3.0);
    expect(updateRes.data?.rounding).toBe('FLOOR_RUPEE');

    // 4. Delete rule
    const deleteRes = await api.DELETE('/api/v1/reward-rules/{id}', {
      params: { path: { id: created.id } },
    });
    expect(deleteRes.response.status).toBe(204);

    const listAfter = await api.GET('/api/v1/reward-rules', {
      params: { query: { accountId: account.id } },
    });
    expect(listAfter.data?.some((r) => r.id === created.id)).toBe(false);
  });

  test('reward rule validations: invalid MCC, negative rates, per-cardholder constraints, accountId ignored on PUT', async ({
    api,
  }) => {
    const { account } = await createRewardCard(api, { name: 'Rule Validation CC' });
    const { account: account2 } = await createRewardCard(api, { name: 'Target CC' });

    // 1. Invalid MCC: 3-digit and 5-digit -> 400
    const invalidMcc3Res = await api.POST('/api/v1/reward-rules', {
      body: {
        accountId: account.id,
        name: 'Bad MCC 3',
        priority: 1,
        accrualType: 'PERCENT',
        percentRate: 1,
        mccs: ['123'],
      },
    });
    expect(invalidMcc3Res.response.status).toBe(400);

    const invalidMcc5Res = await api.POST('/api/v1/reward-rules', {
      body: {
        accountId: account.id,
        name: 'Bad MCC 5',
        priority: 1,
        accrualType: 'PERCENT',
        percentRate: 1,
        mccs: ['12345'],
      },
    });
    expect(invalidMcc5Res.response.status).toBe(400);

    // 2. Negative percentRate -> 400
    const negRateRes = await api.POST('/api/v1/reward-rules', {
      body: {
        accountId: account.id,
        name: 'Neg Rate',
        priority: 1,
        accrualType: 'PERCENT',
        percentRate: -1.5,
      },
    });
    expect(negRateRes.response.status).toBe(400);

    // 3. PER_CARDHOLDER on single-cardholder account -> 400
    await ensurePrimaryCardholder(api, account.id, '1111');
    const singleChRes = await api.POST('/api/v1/reward-rules', {
      body: {
        accountId: account.id,
        name: 'Per CH Rule',
        priority: 1,
        accrualType: 'PERCENT',
        percentRate: 1,
        counterScope: 'PER_CARDHOLDER',
      },
    });
    expect(singleChRes.response.status).toBe(400);

    // 4. PUT ignores accountId (rule stays on its original account)
    const validRule = await createRewardRule(api, account.id, { name: 'Stay On Account Rule' });
    const putRes = await api.PUT('/api/v1/reward-rules/{id}', {
      params: { path: { id: validRule.id } },
      body: {
        accountId: account2.id, // try to transfer to account2
        name: 'Updated Rule Name',
        priority: 1,
        accrualType: 'PERCENT',
        percentRate: 2,
      },
    });
    expect(putRes.response.status).toBe(200);
    expect(putRes.data?.accountId).toBe(account.id); // original account preserved!
  });

  test('rule reorder: incomplete set rejected (400), complete set sets priority and order', async ({
    api,
  }) => {
    const { account } = await createRewardCard(api, { name: 'Reorder CC' });
    const ruleA = await createRewardRule(api, account.id, { name: 'Rule A', priority: 1 });
    const ruleB = await createRewardRule(api, account.id, { name: 'Rule B', priority: 2 });
    const ruleC = await createRewardRule(api, account.id, { name: 'Rule C', priority: 3 });

    // 1. Incomplete set -> 400
    const incompleteRes = await api.POST('/api/v1/reward-rules/reorder', {
      body: {
        accountId: account.id,
        orderedIds: [ruleA.id, ruleB.id], // missing ruleC
      },
    });
    expect(incompleteRes.response.status).toBe(400);
    expect(JSON.stringify(incompleteRes.error)).toContain('orderedIds must contain exactly the account\'s rule ids');

    // 2. Full set: order [ruleC, ruleA, ruleB]
    const reorderRes = await api.POST('/api/v1/reward-rules/reorder', {
      body: {
        accountId: account.id,
        orderedIds: [ruleC.id, ruleA.id, ruleB.id],
      },
    });
    expect(reorderRes.response.status).toBe(200);
    const rules = reorderRes.data ?? [];
    expect(rules.length).toBe(3);
    // Highest priority to first in list
    expect(rules[0].id).toBe(ruleC.id);
    expect(rules[0].priority).toBe(3);
    expect(rules[1].id).toBe(ruleA.id);
    expect(rules[1].priority).toBe(2);
    expect(rules[2].id).toBe(ruleB.id);
    expect(rules[2].priority).toBe(1);
  });

  test('reward rule tenancy and 401 unauthenticated', async ({ api, request }) => {
    const { account } = await createRewardCard(api, { name: 'User A Rule CC' });
    const rule = await createRewardRule(api, account.id, { name: 'User A Rule' });

    const { api: apiB } = await secondUser(request, 'user-b-rules');

    // List GET with foreign accountId returns [] (documented finding)
    const foreignListRes = await apiB.GET('/api/v1/reward-rules', {
      params: { query: { accountId: account.id } },
    });
    expect(foreignListRes.response.status).toBe(200);
    expect(foreignListRes.data).toEqual([]);

    // Mutation on foreign rule -> 400 / 404
    const foreignPutRes = await apiB.PUT('/api/v1/reward-rules/{id}', {
      params: { path: { id: rule.id } },
      body: {
        accountId: account.id,
        name: 'Foreign Mutate',
        priority: 1,
        accrualType: 'PERCENT',
        percentRate: 5,
      },
    });
    expect([400, 403, 404]).toContain(foreignPutRes.response.status);

    const foreignDeleteRes = await apiB.DELETE('/api/v1/reward-rules/{id}', {
      params: { path: { id: rule.id } },
    });
    expect([400, 403, 404]).toContain(foreignDeleteRes.response.status);

    // 401s
    await expectUnauthenticated('GET', `/api/v1/reward-rules?accountId=${account.id}`);
    await expectUnauthenticated('POST', '/api/v1/reward-rules', {
      accountId: account.id,
      name: 'Unauth Rule',
      priority: 1,
      accrualType: 'PERCENT',
      percentRate: 1,
    });
    await expectUnauthenticated('PUT', `/api/v1/reward-rules/${rule.id}`, {
      accountId: account.id,
      name: 'Unauth Rule',
      priority: 1,
      accrualType: 'PERCENT',
      percentRate: 1,
    });
    await expectUnauthenticated('DELETE', `/api/v1/reward-rules/${rule.id}`);
    await expectUnauthenticated('POST', '/api/v1/reward-rules/reorder', {
      accountId: account.id,
      orderedIds: [rule.id],
    });
  });
});
