import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = { refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { POST: vi.fn() } };
});
const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...a: unknown[]) => showToast(...a),
}));

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

import { useApproveTransactions } from './useApproveTransactions';
import { useQuickApprove } from './useQuickApprove';

function setup<T>(hook: () => T) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { invalidate, ...renderHook(hook, { wrapper }) };
}
const ok = (succeededIds: string[], skippedIds: string[] = [], failures: { id: string; reason: string }[] = []) =>
  vi.mocked(api.POST).mockResolvedValue({ data: { succeededIds, skippedIds, failures } } as never);
const cleared = (id: string, reason = 'DUPLICATE_SUSPECT') => ({
  transactionId: id,
  previousReviewType: 'NEEDS_REVIEW',
  previousReviewReasons: [reason],
  previousReviewedAt: null,
  verifiedUpdatedAt: '2026-10-23T10:00:00Z',
});
const post = () => vi.mocked(api.POST).mock.calls.map((c) => c[1]);

describe('useApproveTransactions', () => {
  beforeEach(() => vi.clearAllMocks());
  const txns = [
    { id: 'a', description: 'Swiggy', reviewReasons: ['DUPLICATE_SUSPECT' as const] },
    { id: 'b', description: 'IKEA', reviewReasons: ['UNRECONCILED' as const] },
  ];

  it('approves with the ticked reasons, toasts, and refreshes lists, count and page', async () => {
    ok(['a', 'b']);
    const { result, invalidate } = setup(() => useApproveTransactions());
    let done = false;
    await act(async () => {
      done = await result.current.approve(txns, ['DUPLICATE_SUSPECT', 'UNRECONCILED']);
    });
    expect(done).toBe(true);
    expect(post()).toEqual([
      { body: { transactionIds: ['a', 'b'], reviewType: 'MANUALLY_REVIEWED', reviewReasons: ['DUPLICATE_SUSPECT', 'UNRECONCILED'] } },
    ]);
    expect(showToast).toHaveBeenCalledWith('Approved 2 transactions', expect.objectContaining({ tone: 'success' }));
    expect(result.current.summary).toBeNull();
    const k = invalidate.mock.calls.map((c) => c[0]?.queryKey);
    expect(k).toEqual(expect.arrayContaining([keys.transactions.all, keys.transactions.needsReviewCount()]));
    expect(router.refresh).toHaveBeenCalled();
  });

  describe('Undo', () => {
    const approvedTransactions = [cleared('a'), cleared('b', 'UNRECONCILED')];
    const dialogApprove = async (verifiedRules?: unknown, undoResult: unknown = { data: { restoredTransactionIds: [], skippedTransactionIds: [] } }) => {
      vi.mocked(api.POST).mockImplementation((async (path: string) =>
        path === '/api/v1/transactions/undo-approve'
          ? undoResult
          : { data: { succeededIds: ['a', 'b'], skippedIds: [], failures: [], approvedTransactions, verifiedRules } }) as never);
      const hook = setup(() => useApproveTransactions());
      await act(async () => {
        await hook.result.current.approve(txns, ['DUPLICATE_SUSPECT', 'UNRECONCILED']);
      });
      return hook;
    };
    const undoCalls = () => vi.mocked(api.POST).mock.calls.filter((c) => c[0] === '/api/v1/transactions/undo-approve');

    it('sends the approve response back in one undo-approve request and refreshes even with no verified rules', async () => {
      const { invalidate } = await dialogApprove();
      const options = showToast.mock.calls[0][1];
      expect(options.action.label).toBe('Undo');
      await act(async () => options.action.onSelect());
      expect(vi.mocked(api.POST).mock.calls).toHaveLength(2);
      expect(undoCalls().map((c) => c[1])).toEqual([{ body: { approved: approvedTransactions, rules: [] } }]);
      const k = invalidate.mock.calls.map((c) => c[0]?.queryKey);
      expect(k).toEqual(expect.arrayContaining([keys.rules.all, keys.transactions.all, keys.transactions.needsReviewCount()]));
      expect(router.refresh).toHaveBeenCalledTimes(2);
    });

    it('carries each verified rule with the rows it cleared', async () => {
      await dialogApprove([{ ruleId: 'r1', clearedTransactionIds: ['x'], clearedTransactions: [cleared('x')] }]);
      await act(async () => showToast.mock.calls[0][1].action.onSelect());
      expect(undoCalls().map((c) => c[1])).toEqual([
        { body: { approved: approvedTransactions, rules: [{ ruleId: 'r1', restore: [cleared('x')] }] } },
      ]);
    });

    it('shows the failure toast and refreshes nothing when the undo is rejected', async () => {
      const { invalidate } = await dialogApprove(undefined, { error: { message: 'too many' } });
      invalidate.mockClear();
      router.refresh.mockClear();
      await act(async () => showToast.mock.calls[0][1].action.onSelect());
      expect(undoCalls()).toHaveLength(1);
      expect(showToast).toHaveBeenLastCalledWith(expect.any(String), { tone: 'danger' });
      expect(invalidate).not.toHaveBeenCalled();
      expect(router.refresh).not.toHaveBeenCalled();
    });
  });

  it('opens the summary instead of a toast when a row was skipped or failed', async () => {
    ok(['a'], ['b'], [{ id: 'x', reason: 'NOT_FOUND' }]);
    const { result } = setup(() => useApproveTransactions());
    await act(async () => {
      await result.current.approve(txns, ['DUPLICATE_SUSPECT']);
    });
    expect(showToast).not.toHaveBeenCalled();
    expect(result.current.summary).toMatchObject({
      succeededCount: 1,
      skippedCount: 1,
      skips: ['IKEA'],
      failures: [{ description: 'Transaction ID: x' }],
    });
    act(() => result.current.closeSummary());
    expect(result.current.summary).toBeNull();
  });

  it('shows the server message and resolves false on error', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = setup(() => useApproveTransactions());
    let done = true;
    await act(async () => {
      done = await result.current.approve(txns, ['UNRECONCILED']);
    });
    expect(done).toBe(false);
    expect(showToast).toHaveBeenCalledWith("Couldn't approve. Try again.", { tone: 'danger' });
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe('useQuickApprove', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears a single reason at once and toasts Approved with Undo that puts it back', async () => {
    vi.mocked(api.POST).mockResolvedValue({
      data: { succeededIds: ['a'], skippedIds: [], failures: [], approvedTransactions: [cleared('a')] },
    } as never);
    const { result } = setup(() => useQuickApprove());
    let outcome;
    await act(async () => {
      outcome = await result.current.quickApprove({ id: 'a', reviewReasons: ['DUPLICATE_SUSPECT'] });
    });
    expect(outcome).toBe('approved');
    expect(post()[0]).toEqual({
      body: { transactionIds: ['a'], reviewType: 'MANUALLY_REVIEWED', reviewReasons: ['DUPLICATE_SUSPECT'] },
    });
    const options = showToast.mock.calls[0][1];
    expect(showToast.mock.calls[0][0]).toBe('Approved');
    await act(async () => options.action.onSelect());
    expect(vi.mocked(api.POST).mock.calls[1][0]).toBe('/api/v1/transactions/undo-approve');
    expect(post()[1]).toEqual({ body: { approved: [cleared('a')], rules: [] } });
  });

  describe('Undo with verified rules', () => {
    const rule = { ruleId: 'r1', clearedTransactionIds: ['x', 'y'], clearedTransactions: [cleared('x'), cleared('y')] };
    const approveThenUndo = async (undoResult: unknown = { data: { restoredTransactionIds: [], skippedTransactionIds: [] } }) => {
      vi.mocked(api.POST).mockImplementation((async (path: string) =>
        path === '/api/v1/transactions/undo-approve'
          ? undoResult
          : {
              data: {
                succeededIds: ['a'],
                skippedIds: [],
                failures: [],
                approvedTransactions: [cleared('a', 'CATEGORY_UNVERIFIED')],
                verifiedRules: [rule],
              },
            }) as never);
      const hook = setup(() => useQuickApprove());
      await act(async () => {
        await hook.result.current.quickApprove({ id: 'a', reviewReasons: ['CATEGORY_UNVERIFIED'] });
      });
      await act(async () => showToast.mock.calls[0][1].action.onSelect());
      return hook;
    };
    const undos = () => vi.mocked(api.POST).mock.calls.filter((c) => c[0] === '/api/v1/transactions/undo-approve');

    it('restores the approved row and each verified rule rows in one request, and refreshes rules', async () => {
      const { invalidate } = await approveThenUndo();
      expect(undos().map((c) => c[1])).toEqual([
        { body: { approved: [cleared('a', 'CATEGORY_UNVERIFIED')], rules: [{ ruleId: 'r1', restore: rule.clearedTransactions }] } },
      ]);
      expect(invalidate.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual(keys.rules.all);
    });

    it('shows the error toast when the undo fails, with no other calls', async () => {
      await approveThenUndo({ error: { message: 'nope' } });
      expect(showToast).toHaveBeenLastCalledWith(expect.any(String), { tone: 'danger' });
      expect(vi.mocked(api.POST).mock.calls).toHaveLength(2);
    });
  });

  it('asks the caller for the dialog when the row has several reasons, without a request', async () => {
    const { result } = setup(() => useQuickApprove());
    let outcome;
    await act(async () => {
      outcome = await result.current.quickApprove({ id: 'a', reviewReasons: ['DUPLICATE_SUSPECT', 'UNRECONCILED'] });
    });
    expect(outcome).toBe('needs-dialog');
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('does nothing for a row with no reason', async () => {
    const { result } = setup(() => useQuickApprove());
    let outcome;
    await act(async () => {
      outcome = await result.current.quickApprove({ id: 'a', reviewReasons: [] });
    });
    expect(outcome).toBe('nothing-to-approve');
    expect(api.POST).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('tells the person when the server skipped the row, and offers no Undo', async () => {
    ok([], ['a']);
    const { result } = setup(() => useQuickApprove());
    let outcome;
    await act(async () => {
      outcome = await result.current.quickApprove({ id: 'a', reviewReasons: ['UNRECONCILED'] });
    });
    expect(outcome).toBe('failed');
    expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' });
  });

  it('shows an error toast when the request fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = setup(() => useQuickApprove());
    let outcome;
    await act(async () => {
      outcome = await result.current.quickApprove({ id: 'a', reviewReasons: ['UNRECONCILED'] });
    });
    expect(outcome).toBe('failed');
    expect(showToast).toHaveBeenCalledWith("Couldn't approve. Try again.", { tone: 'danger' });
  });
});
