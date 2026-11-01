import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: mocks }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { applyRule, createRule, deleteRule, loadRuleMatches, updateRule } from './ruleActions';

beforeEach(() => vi.clearAllMocks());

describe('rule actions', () => {
  it('creates, updates and deletes a rule', async () => {
    mocks.POST.mockResolvedValue({ data: { id: 'r1' } });
    mocks.PUT.mockResolvedValue({ data: { id: 'r1' } });
    mocks.DELETE.mockResolvedValue({ data: undefined });
    const body = { merchantKey: 'DUNZO', matchType: 'CONTAINS', categoryKey: 'food' } as never;
    expect(await createRule(body)).toEqual({ success: true, data: { id: 'r1' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/rules', { body });
    await updateRule('r1', body);
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/rules/{id}', { params: { path: { id: 'r1' } }, body });
    expect((await deleteRule('r1')).success).toBe(true);
    expect(mocks.DELETE).toHaveBeenCalledWith('/api/v1/rules/{id}', { params: { path: { id: 'r1' } } });
  });

  it('loads one page of matches', async () => {
    const preview = { matchCount: 0, userSetCount: 0, matches: { content: [], totalElements: 0 } };
    mocks.POST.mockResolvedValue({ data: preview });
    expect(await loadRuleMatches('DUNZO', 'CONTAINS', 2, 20)).toEqual({ success: true, data: preview });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/rules/preview-matches', {
      params: { query: { page: 2, size: 20, sort: [] } },
      body: { merchantKey: 'DUNZO', matchType: 'CONTAINS' },
    });
  });

  it('starts an apply job for every match or for the ticked ones', async () => {
    mocks.POST.mockResolvedValue({ data: { jobId: 'j1' } });
    expect(await applyRule('r1', { all: true })).toEqual({ success: true, data: { jobId: 'j1' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/rules/{id}/apply', { params: { path: { id: 'r1' } }, body: { all: true } });
    await applyRule('r1', { transactionIds: ['t1'] });
    expect(mocks.POST).toHaveBeenLastCalledWith('/api/v1/rules/{id}/apply', { params: { path: { id: 'r1' } }, body: { transactionIds: ['t1'] } });
  });

  it('reports a failure with the fallback message', async () => {
    mocks.POST.mockRejectedValue(new Error('down'));
    expect(await applyRule('r1', { all: true })).toMatchObject({ success: false, error: { message: "Couldn't apply the rule. Try again." } });
  });
});
