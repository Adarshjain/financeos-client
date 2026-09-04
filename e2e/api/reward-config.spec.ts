import { createRewardCard, getRewardConfig, recommend, setRewardConfig } from '../fixtures/seed/rewards';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Reward Config API (@api)', () => {
  test('get default config, update pointValueInr and defaultRewardType, validate constraints', async ({
    api,
  }) => {
    const { account } = await createRewardCard(api, {
      name: 'Reward Config Card',
      anniversaryDate: '2025-08-15',
    });

    // 1. Get defaults
    const defaultConfig = await getRewardConfig(api, account.id);
    expect(defaultConfig.accountId).toBe(account.id);
    expect(defaultConfig.defaultRewardType).toBe('CASH');
    expect(defaultConfig.pointValueInr).toBeNull();
    // Anniversary date is read-only and mirrors the account
    expect(defaultConfig.rewardAnniversaryDate).toBe('2025-08-15');

    // 2. Set pointValueInr = 0.50 and defaultRewardType = POINTS
    const updated = await setRewardConfig(api, account.id, {
      pointValueInr: 0.5,
      defaultRewardType: 'POINTS',
    });
    expect(updated.pointValueInr).toBe(0.5);
    expect(updated.defaultRewardType).toBe('POINTS');

    // 3. Validation: 0 or negative pointValueInr -> 400
    const zeroRes = await api.PUT('/api/v1/reward-config', {
      body: { accountId: account.id, pointValueInr: 0 },
    });
    expect(zeroRes.response.status).toBe(400);

    const negRes = await api.PUT('/api/v1/reward-config', {
      body: { accountId: account.id, pointValueInr: -0.25 },
    });
    expect(negRes.response.status).toBe(400);

    // 4. Setting null resets to 0.25 default behavior (assert via recommender pointValueSource=DEFAULT)
    const reset = await setRewardConfig(api, account.id, {
      pointValueInr: null,
      defaultRewardType: 'CASH',
    });
    expect(reset.pointValueInr).toBeNull();
    expect(reset.defaultRewardType).toBe('CASH');

    const recResp = await recommend(api, {
      amount: 1000,
      accountIds: [account.id],
    });
    const cardRec = recResp.recommendations.find((r) => r.accountId === account.id);
    expect(cardRec).toBeDefined();
    expect(cardRec?.pointValueSource).toBe('DEFAULT');
  });

  test('reward config cross-tenant access and unauthenticated checks', async ({
    api,
    request,
  }) => {
    const { account } = await createRewardCard(api, { name: 'User A Config CC' });
    const { api: apiB } = await secondUser(request, 'user-b-config');

    // User B attempting to update User A's reward config -> 400
    const foreignPutRes = await apiB.PUT('/api/v1/reward-config', {
      body: { accountId: account.id, pointValueInr: 0.5 },
    });
    expect([400, 403, 404]).toContain(foreignPutRes.response.status);

    // 401 unauthenticated
    await expectUnauthenticated('GET', `/api/v1/reward-config?accountId=${account.id}`);
    await expectUnauthenticated('PUT', '/api/v1/reward-config', {
      accountId: account.id,
      pointValueInr: 0.5,
    });
  });
});
