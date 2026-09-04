import { addCardholder, ensurePrimaryCardholder } from '../fixtures/seed/accounts';
import { createBucket, createRewardCard, createRule } from '../fixtures/seed/rewards';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Reward Cap Buckets API (@api)', () => {
  test('cap bucket CRUD lifecycle and updates', async ({ api }) => {
    const { account } = await createRewardCard(api, { name: 'Bucket CC' });

    // 1. Create Bucket
    const bucket = await createBucket(api, account.id, {
      name: 'Dining & Travel Pool',
      cap: 1500,
      rewardType: 'CASH',
      windowType: 'CALENDAR_MONTH',
      counterScope: 'ACCOUNT',
    });
    expect(bucket.id).toBeDefined();
    expect(bucket.name).toBe('Dining & Travel Pool');
    expect(bucket.cap).toBe(1500);
    expect(bucket.rewardType).toBe('CASH');
    expect(bucket.windowType).toBe('CALENDAR_MONTH');
    expect(bucket.counterScope).toBe('ACCOUNT');
    expect(bucket.ruleCount).toBe(0);

    // 2. List buckets for account
    const listRes = await api.GET('/api/v1/reward-cap-buckets', {
      params: { query: { accountId: account.id } },
    });
    expect(listRes.response.status).toBe(200);
    expect(listRes.data?.some((b) => b.id === bucket.id)).toBe(true);

    // 3. Update bucket
    const updateRes = await api.PUT('/api/v1/reward-cap-buckets/{id}', {
      params: { path: { id: bucket.id } },
      body: {
        accountId: account.id,
        name: 'Dining & Travel Pool Updated',
        cap: 2000,
        rewardType: 'CASH',
        windowType: 'QUARTER',
        counterScope: 'ACCOUNT',
      },
    });
    expect(updateRes.response.status).toBe(200);
    expect(updateRes.data?.name).toBe('Dining & Travel Pool Updated');
    expect(updateRes.data?.cap).toBe(2000);
    expect(updateRes.data?.windowType).toBe('QUARTER');

    // 4. Delete bucket
    const deleteRes = await api.DELETE('/api/v1/reward-cap-buckets/{id}', {
      params: { path: { id: bucket.id } },
    });
    expect(deleteRes.response.status).toBe(204);

    // Verify gone
    const listAfter = await api.GET('/api/v1/reward-cap-buckets', {
      params: { query: { accountId: account.id } },
    });
    expect(listAfter.data?.some((b) => b.id === bucket.id)).toBe(false);
  });

  test('delete and rewardType change blocked while referenced by rules', async ({ api }) => {
    const { account } = await createRewardCard(api, { name: 'Referenced Bucket CC' });

    const bucket = await createBucket(api, account.id, {
      name: 'Locked Bucket',
      cap: 500,
      rewardType: 'CASH',
      windowType: 'CALENDAR_MONTH',
    });

    const rule = await createRule(api, account.id, {
      name: 'Rule using bucket',
      capBucketId: bucket.id,
    });
    expect(rule.capBucketId).toBe(bucket.id);

    // 1. Delete blocked -> 400
    const deleteRes = await api.DELETE('/api/v1/reward-cap-buckets/{id}', {
      params: { path: { id: bucket.id } },
    });
    expect(deleteRes.response.status).toBe(400);
    const deleteErr = JSON.stringify(deleteRes.error);
    expect(deleteErr).toContain('This bucket is used by 1 rule(s) — detach them first.');

    // 2. Changing rewardType to POINTS while referenced -> 400
    const changeTypeRes = await api.PUT('/api/v1/reward-cap-buckets/{id}', {
      params: { path: { id: bucket.id } },
      body: {
        accountId: account.id,
        name: 'Locked Bucket',
        cap: 500,
        rewardType: 'POINTS',
        windowType: 'CALENDAR_MONTH',
      },
    });
    expect(changeTypeRes.response.status).toBe(400);
    const changeErr = JSON.stringify(changeTypeRes.error);
    expect(changeErr).toContain('This bucket is used by rules — detach them before changing its reward type.');

    // 3. Delete rule, then bucket deletion succeeds
    const deleteRuleRes = await api.DELETE('/api/v1/reward-rules/{id}', {
      params: { path: { id: rule.id } },
    });
    expect(deleteRuleRes.response.status).toBe(204);

    const deleteBucketRes = await api.DELETE('/api/v1/reward-cap-buckets/{id}', {
      params: { path: { id: bucket.id } },
    });
    expect(deleteBucketRes.response.status).toBe(204);
  });

  test('PER_CARDHOLDER counterScope requires at least 2 open cardholders', async ({ api }) => {
    const { account } = await createRewardCard(api, { name: 'Per-Cardholder CC' });
    // Initially has 0 or 1 cardholder
    await ensurePrimaryCardholder(api, account.id, '1111');

    // Creating PER_CARDHOLDER bucket on 1 cardholder -> 400
    const failRes = await api.POST('/api/v1/reward-cap-buckets', {
      body: {
        accountId: account.id,
        name: 'Split Cap',
        cap: 1000,
        windowType: 'CALENDAR_MONTH',
        rewardType: 'CASH',
        counterScope: 'PER_CARDHOLDER',
      },
    });
    expect(failRes.response.status).toBe(400);
    expect(JSON.stringify(failRes.error)).toContain('Per-cardholder counter scope requires an account with at least two open cardholders');

    // Add second (addon) cardholder
    await addCardholder(api, account.id, {
      personName: 'Addon User',
      relationship: 'SPOUSE',
      last4: '2222',
    });

    // Now creation succeeds with 201
    const successRes = await api.POST('/api/v1/reward-cap-buckets', {
      body: {
        accountId: account.id,
        name: 'Split Cap',
        cap: 1000,
        windowType: 'CALENDAR_MONTH',
        rewardType: 'CASH',
        counterScope: 'PER_CARDHOLDER',
      },
    });
    expect(successRes.response.status).toBe(201);
    expect(successRes.data?.counterScope).toBe('PER_CARDHOLDER');
  });

  test('cap bucket tenancy and 401 unauthenticated', async ({ api, request }) => {
    const { account } = await createRewardCard(api, { name: 'User A Bucket CC' });
    const bucket = await createBucket(api, account.id, { name: 'User A Bucket' });

    const { api: apiB } = await secondUser(request, 'user-b-buckets');

    // List GET with foreign accountId returns [] (Hibernate userFilter row scoping)
    const listForeignRes = await apiB.GET('/api/v1/reward-cap-buckets', {
      params: { query: { accountId: account.id } },
    });
    expect(listForeignRes.response.status).toBe(200);
    expect(listForeignRes.data).toEqual([]);

    // Mutation on foreign bucket -> 400 / 404
    const mutateForeignRes = await apiB.PUT('/api/v1/reward-cap-buckets/{id}', {
      params: { path: { id: bucket.id } },
      body: {
        accountId: account.id,
        name: 'Hacked Bucket',
        cap: 9999,
        windowType: 'CALENDAR_MONTH',
      },
    });
    expect([400, 403, 404]).toContain(mutateForeignRes.response.status);

    const deleteForeignRes = await apiB.DELETE('/api/v1/reward-cap-buckets/{id}', {
      params: { path: { id: bucket.id } },
    });
    expect([400, 403, 404]).toContain(deleteForeignRes.response.status);

    // 401s
    await expectUnauthenticated('GET', `/api/v1/reward-cap-buckets?accountId=${account.id}`);
    await expectUnauthenticated('POST', '/api/v1/reward-cap-buckets', {
      accountId: account.id,
      name: 'Unauth Bucket',
      cap: 500,
      windowType: 'CALENDAR_MONTH',
    });
    await expectUnauthenticated('PUT', `/api/v1/reward-cap-buckets/${bucket.id}`, {
      accountId: account.id,
      name: 'Unauth Bucket',
      cap: 500,
      windowType: 'CALENDAR_MONTH',
    });
    await expectUnauthenticated('DELETE', `/api/v1/reward-cap-buckets/${bucket.id}`);
  });
});
