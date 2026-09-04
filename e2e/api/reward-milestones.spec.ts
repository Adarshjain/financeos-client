import { createMilestone, createRewardCard, fixedMonth, report, spend } from '../fixtures/seed/rewards';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Reward Milestones API (@api)', () => {
  test('milestone CRUD lifecycle and validations', async ({ api }) => {
    const { account } = await createRewardCard(api, { name: 'Milestone CC' });

    // 1. Create Milestone (SPEND, CASH_VALUE, CALENDAR_MONTH)
    const created = await createMilestone(api, account.id, {
      name: 'Quarterly Spend Bonus',
      basis: 'SPEND',
      threshold: 50000,
      payoutType: 'CASH_VALUE',
      payoutValue: 2000,
      payoutTiming: 'WINDOW_END',
      windowType: 'QUARTER',
    });
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Quarterly Spend Bonus');
    expect(created.basis).toBe('SPEND');
    expect(created.threshold).toBe(50000);
    expect(created.payoutValue).toBe(2000);

    // 2. List milestones for account
    const listRes = await api.GET('/api/v1/reward-milestones', {
      params: { query: { accountId: account.id } },
    });
    expect(listRes.response.status).toBe(200);
    expect(listRes.data?.some((m) => m.id === created.id)).toBe(true);

    // 3. Update milestone
    const updateRes = await api.PUT('/api/v1/reward-milestones/{id}', {
      params: { path: { id: created.id } },
      body: {
        accountId: account.id,
        name: 'Quarterly Spend Bonus Updated',
        basis: 'SPEND',
        threshold: 60000,
        payoutType: 'CASH_VALUE',
        payoutValue: 2500,
        payoutTiming: 'ON_ACHIEVEMENT',
        windowType: 'QUARTER',
      },
    });
    expect(updateRes.response.status).toBe(200);
    expect(updateRes.data?.threshold).toBe(60000);
    expect(updateRes.data?.payoutValue).toBe(2500);
    expect(updateRes.data?.payoutTiming).toBe('ON_ACHIEVEMENT');

    // 4. Delete milestone
    const deleteRes = await api.DELETE('/api/v1/reward-milestones/{id}', {
      params: { path: { id: created.id } },
    });
    expect(deleteRes.response.status).toBe(204);

    const listAfter = await api.GET('/api/v1/reward-milestones', {
      params: { query: { accountId: account.id } },
    });
    expect(listAfter.data?.some((m) => m.id === created.id)).toBe(false);
  });

  test('milestone validations: ONE_TIME without dates (400), CASH_VALUE without payoutValue (400)', async ({
    api,
  }) => {
    const { account } = await createRewardCard(api, { name: 'Milestone Val CC' });

    // 1. ONE_TIME window without both activeFrom and activeTo -> 400
    const missingDatesRes = await api.POST('/api/v1/reward-milestones', {
      body: {
        accountId: account.id,
        name: 'One-time bonus',
        basis: 'SPEND',
        threshold: 10000,
        payoutType: 'CASH_VALUE',
        payoutValue: 500,
        payoutTiming: 'WINDOW_END',
        windowType: 'ONE_TIME',
        activeFrom: '2025-01-01',
        // activeTo missing
      },
    });
    expect(missingDatesRes.response.status).toBe(400);

    // 2. CASH_VALUE without payoutValue -> 400
    const missingPayoutRes = await api.POST('/api/v1/reward-milestones', {
      body: {
        accountId: account.id,
        name: 'Missing Payout',
        basis: 'SPEND',
        threshold: 10000,
        payoutType: 'CASH_VALUE',
        payoutTiming: 'WINDOW_END',
        windowType: 'CALENDAR_MONTH',
      },
    });
    expect(missingPayoutRes.response.status).toBe(400);
  });

  test('INFO_TRACKER milestone tracks progress but contributes 0 cash/gross value in report', async ({
    api,
  }) => {
    const { account } = await createRewardCard(api, { name: 'Info Tracker CC' });
    const month = fixedMonth();

    await createMilestone(api, account.id, {
      name: 'Annual Fee Waiver',
      basis: 'SPEND',
      threshold: 5000,
      payoutType: 'INFO_TRACKER',
      payoutTiming: 'WINDOW_END',
      windowType: 'CALENDAR_MONTH',
    });

    // Spend ₹6000 in the month (crosses 5000 threshold)
    await spend(api, account.id, {
      amount: 6000,
      date: `${month.from.slice(0, 7)}-10`,
    });

    const rep = await report(api, account.id, month.from, month.to);
    expect(rep.milestones.length).toBe(1);
    expect(rep.milestones[0].payoutType).toBe('INFO_TRACKER');
    expect(rep.milestones[0].achieved).toBe(true);
    // Summary gross rewards and milestone value should be 0 since INFO_TRACKER pays 0
    expect(rep.summary.milestonesInr).toBe(0);
    expect(rep.summary.grossValueInr).toBe(0);
  });

  test('milestones tenancy and 401 unauthenticated', async ({ api, request }) => {
    const { account } = await createRewardCard(api, { name: 'User A Milestone CC' });
    const milestone = await createMilestone(api, account.id, { name: 'User A Milestone' });

    const { api: apiB } = await secondUser(request, 'user-b-milestones');

    // Foreign list -> []
    const foreignList = await apiB.GET('/api/v1/reward-milestones', {
      params: { query: { accountId: account.id } },
    });
    expect(foreignList.response.status).toBe(200);
    expect(foreignList.data).toEqual([]);

    // Foreign mutate -> 400 / 404
    const foreignPut = await apiB.PUT('/api/v1/reward-milestones/{id}', {
      params: { path: { id: milestone.id } },
      body: {
        accountId: account.id,
        name: 'Hacked Milestone',
        basis: 'SPEND',
        threshold: 1000,
        payoutType: 'INFO_TRACKER',
        payoutTiming: 'WINDOW_END',
        windowType: 'CALENDAR_MONTH',
      },
    });
    expect([400, 403, 404]).toContain(foreignPut.response.status);

    const foreignDel = await apiB.DELETE('/api/v1/reward-milestones/{id}', {
      params: { path: { id: milestone.id } },
    });
    expect([400, 403, 404]).toContain(foreignDel.response.status);

    // 401s
    await expectUnauthenticated('GET', `/api/v1/reward-milestones?accountId=${account.id}`);
    await expectUnauthenticated('POST', '/api/v1/reward-milestones', {
      accountId: account.id,
      name: 'Unauth',
      basis: 'SPEND',
      threshold: 1000,
      payoutType: 'INFO_TRACKER',
      payoutTiming: 'WINDOW_END',
      windowType: 'CALENDAR_MONTH',
    });
    await expectUnauthenticated('PUT', `/api/v1/reward-milestones/${milestone.id}`, {
      accountId: account.id,
      name: 'Unauth',
      basis: 'SPEND',
      threshold: 1000,
      payoutType: 'INFO_TRACKER',
      payoutTiming: 'WINDOW_END',
      windowType: 'CALENDAR_MONTH',
    });
    await expectUnauthenticated('DELETE', `/api/v1/reward-milestones/${milestone.id}`);
  });
});
