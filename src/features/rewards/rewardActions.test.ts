import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import * as actions from './rewardActions';

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of Object.values(api)) fn.mockResolvedValue({ data: { id: 'x' } });
});

describe('rewards read actions', () => {
  it.each([
    ['loadRewardCapBuckets', '/api/v1/reward-cap-buckets'],
    ['loadRewardMilestones', '/api/v1/reward-milestones'],
    ['loadRewardRules', '/api/v1/reward-rules'],
  ] as const)('%s asks for the account and defaults to an empty list', async (name, url) => {
    api.GET.mockResolvedValue({ data: [{ id: 'a' }] });
    expect(await actions[name]('acc-1')).toEqual({ success: true, data: [{ id: 'a' }] });
    expect(api.GET).toHaveBeenCalledWith(url, { params: { query: { accountId: 'acc-1' } } });
    api.GET.mockResolvedValue({ data: undefined });
    expect(await actions[name]('acc-1')).toEqual({ success: true, data: [] });
  });

  it('loadRewardAccountConfig and loadRewardReport', async () => {
    await actions.loadRewardAccountConfig('acc-1');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/reward-config', { params: { query: { accountId: 'acc-1' } } });
    await actions.loadRewardReport('acc-1', '2026-01-01', '2026-01-31');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/rewards/report', {
      params: { query: { accountId: 'acc-1', from: '2026-01-01', to: '2026-01-31' } },
    });
  });

  it('loadRewardLines narrows earnedUnit and keeps the paging fields', async () => {
    api.GET.mockResolvedValue({
      data: {
        content: [{ id: '1', earnedUnit: 'POINTS' }, { id: '2', earnedUnit: 'whatever' }],
        totalElements: 2, totalPages: 1, size: 10, number: 0, first: true, last: true, empty: false,
      },
    });
    const result = await actions.loadRewardLines({ accountId: 'a', from: 'f', to: 't', ruleId: 'r', page: 0, size: 10 });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/rewards/lines', {
      params: { query: { accountId: 'a', from: 'f', to: 't', ruleId: 'r', page: 0, size: 10, sort: [] } },
    });
    expect(result).toMatchObject({
      success: true,
      data: { content: [{ earnedUnit: 'POINTS' }, { earnedUnit: 'RUPEES' }], totalElements: 2, empty: false },
    });
  });

  it('a failing read reports the call site message', async () => {
    api.GET.mockRejectedValue(new Error('down'));
    expect(await actions.loadRewardRules('a')).toMatchObject({ success: false, error: { message: "Couldn't load the reward rules. Try again." } });
  });
});

describe('rewards write actions', () => {
  it('cap buckets: create, update, delete', async () => {
    const body = { accountId: 'a', name: 'n', cap: 1, windowType: 'CALENDAR_MONTH' } as never;
    await actions.createRewardCapBucket(body);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/reward-cap-buckets', { body });
    await actions.updateRewardCapBucket('b1', body);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/reward-cap-buckets/{id}', { params: { path: { id: 'b1' } }, body });
    expect(await actions.deleteRewardCapBucket('b1')).toEqual({ success: true, data: undefined });
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/reward-cap-buckets/{id}', { params: { path: { id: 'b1' } } });
  });

  it('milestones: create and update map null to undefined, delete by id', async () => {
    const body = { accountId: 'a', name: 'n', cardholderId: null, minTxnAmount: null, activeTo: '2026-06-01' } as never;
    await actions.createRewardMilestone(body);
    const sent = api.POST.mock.calls[0][1].body;
    expect(api.POST.mock.calls[0][0]).toBe('/api/v1/reward-milestones');
    expect(sent.cardholderId).toBeUndefined();
    expect(sent.minTxnAmount).toBeUndefined();
    expect(sent.activeTo).toBe('2026-06-01');
    await actions.updateRewardMilestone('m1', body);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/reward-milestones/{id}', expect.objectContaining({ params: { path: { id: 'm1' } } }));
    await actions.deleteRewardMilestone('m1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/reward-milestones/{id}', { params: { path: { id: 'm1' } } });
  });

  it('rules: create and update map null to undefined (tiers too), delete, reorder', async () => {
    const body = { accountId: 'a', name: 'n', merchantPattern: null, tiers: [{ rate: 1, upTo: null }] } as never;
    await actions.createRewardRule(body);
    const sent = api.POST.mock.calls[0][1].body;
    expect(api.POST.mock.calls[0][0]).toBe('/api/v1/reward-rules');
    expect(sent.merchantPattern).toBeUndefined();
    expect(sent.tiers).toEqual([{ rate: 1, upTo: undefined }]);
    await actions.updateRewardRule('r1', body);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/reward-rules/{id}', expect.objectContaining({ params: { path: { id: 'r1' } } }));
    await actions.deleteRewardRule('r1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/reward-rules/{id}', { params: { path: { id: 'r1' } } });
    api.POST.mockResolvedValue({ data: undefined });
    expect(await actions.reorderRewardRules({ accountId: 'a', orderedIds: ['2', '1'] })).toEqual({ success: true, data: [] });
    expect(api.POST).toHaveBeenLastCalledWith('/api/v1/reward-rules/reorder', { body: { accountId: 'a', orderedIds: ['2', '1'] } });
  });

  it('updateRewardAccountConfig maps null to undefined', async () => {
    await actions.updateRewardAccountConfig({ accountId: 'a', defaultRewardType: 'POINTS', pointValueInr: null });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/reward-config', {
      body: { accountId: 'a', defaultRewardType: 'POINTS', pointValueInr: undefined },
    });
  });

  it('recommendRewardCards posts the simulation', async () => {
    const body = { amount: 5, date: '2026-10-01' } as never;
    expect(await actions.recommendRewardCards(body)).toEqual({ success: true, data: { id: 'x' } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/reward-recommendations', { body });
  });
});
