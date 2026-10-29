import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: mocks }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { applyRule, createRule, deleteRule, loadRuleMatches, unverifyRule, updateRule, verifyRule, verifyRules } from './ruleActions';

beforeEach(() => vi.clearAllMocks());

describe('rule actions', () => {
  it('creates, updates and deletes a rule', async () => {
    mocks.POST.mockResolvedValue({ data: { id: 'r1' } });
    mocks.PUT.mockResolvedValue({ data: { id: 'r1' } });
    mocks.DELETE.mockResolvedValue({ data: undefined });
    const body = { merchantKey: 'DUNZO', matchType: 'CONTAINS', categoryIds: ['c1'] } as never;
    expect(await createRule(body)).toEqual({ success: true, data: { id: 'r1' } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/rules', { body });
    await updateRule('r1', body);
    expect(mocks.PUT).toHaveBeenCalledWith('/api/v1/rules/{id}', { params: { path: { id: 'r1' } }, body });
    expect((await deleteRule('r1')).success).toBe(true);
    expect(mocks.DELETE).toHaveBeenCalledWith('/api/v1/rules/{id}', { params: { path: { id: 'r1' } } });
  });

  it('verifies one rule and many', async () => {
    mocks.POST.mockResolvedValue({ data: { clearedTransactions: [] } });
    await verifyRule('r1');
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/rules/{id}/verify', { params: { path: { id: 'r1' } } });
    mocks.POST.mockResolvedValue({ data: { verifiedCount: 2, verifiedRules: [] } });
    expect(await verifyRules(['r1', 'r2'])).toEqual({ success: true, data: { verifiedCount: 2, verifiedRules: [] } });
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/rules/verify', { body: { ruleIds: ['r1', 'r2'] } });
  });

  it('unverifies one chunk and fails when the server sends nothing back', async () => {
    mocks.POST.mockResolvedValue({ data: { ok: true } });
    const restore = [{ transactionId: 't1' }] as never;
    expect((await unverifyRule('r1', restore)).success).toBe(true);
    expect(mocks.POST).toHaveBeenCalledWith('/api/v1/rules/{id}/unverify', {
      params: { path: { id: 'r1' } },
      body: { transactionIds: [], restore },
    });
    mocks.POST.mockResolvedValue({ data: undefined });
    expect((await unverifyRule('r1', restore)).success).toBe(false);
  });

  it('loads one page of matches', async () => {
    mocks.POST.mockResolvedValue({ data: { content: [], totalElements: 0 } });
    expect(await loadRuleMatches('DUNZO', 'CONTAINS', 2, 20)).toEqual({ success: true, data: { content: [], totalElements: 0 } });
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
