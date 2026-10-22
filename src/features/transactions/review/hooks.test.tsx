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
    const dialogApprove = async (verifiedRules?: unknown) => {
      vi.mocked(api.POST).mockImplementation((async (path: string) =>
        path === '/api/v1/rules/{id}/unverify'
          ? { data: { restoredTransactionIds: [] } }
          : { data: { succeededIds: ['a', 'b'], skippedIds: [], failures: [], verifiedRules } }) as never);
      const hook = setup(() => useApproveTransactions());
      await act(async () => {
        await hook.result.current.approve(txns, ['DUPLICATE_SUSPECT', 'UNRECONCILED']);
      });
      return hook;
    };

    it('offers Undo that puts each row its own cleared reasons back', async () => {
      await dialogApprove();
      const options = showToast.mock.calls[0][1];
      expect(options.action.label).toBe('Undo');
      await act(async () => options.action.onSelect());
      expect(post().slice(1)).toEqual([
        { body: { transactionIds: ['a'], reviewType: 'NEEDS_REVIEW', reviewReasons: ['DUPLICATE_SUSPECT'] } },
        { body: { transactionIds: ['b'], reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED'] } },
      ]);
    });

    it('also unverifies the verified rules and refreshes rules', async () => {
      const { invalidate } = await dialogApprove([{ ruleId: 'r1', clearedTransactionIds: ['x'] }]);
      await act(async () => showToast.mock.calls[0][1].action.onSelect());
      const unverify = vi.mocked(api.POST).mock.calls.filter((c) => c[0] === '/api/v1/rules/{id}/unverify');
      expect(unverify.map((c) => c[1])).toEqual([{ params: { path: { id: 'r1' } }, body: { transactionIds: ['x'] } }]);
      expect(invalidate.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual(keys.rules.all);
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
    expect(showToast).toHaveBeenCalledWith('Could not approve', { tone: 'danger' });
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe('useQuickApprove', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears a single reason at once and toasts Approved with Undo that puts it back', async () => {
    ok(['a']);
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
    expect(post()[1]).toEqual({
      body: { transactionIds: ['a'], reviewType: 'NEEDS_REVIEW', reviewReasons: ['DUPLICATE_SUSPECT'] },
    });
  });

  describe('Undo with verified rules', () => {
    const approveThenUndo = async (verifiedRules?: unknown) => {
      vi.mocked(api.POST).mockImplementation((async (path: string) =>
        path === '/api/v1/rules/{id}/unverify'
          ? { data: { restoredTransactionIds: [] } }
          : { data: { succeededIds: ['a'], skippedIds: [], failures: [], verifiedRules } }) as never);
      const hook = setup(() => useQuickApprove());
      await act(async () => {
        await hook.result.current.quickApprove({ id: 'a', reviewReasons: ['CATEGORY_UNVERIFIED'] });
      });
      const options = showToast.mock.calls[0][1];
      await act(async () => options.action.onSelect());
      return hook;
    };
    const unverifies = () => vi.mocked(api.POST).mock.calls.filter((c) => c[0] === '/api/v1/rules/{id}/unverify');

    it('unverifies each verified rule with its cleared ids and refreshes rules', async () => {
      const { invalidate } = await approveThenUndo([
        { ruleId: 'r1', clearedTransactionIds: ['x', 'y'] },
        { ruleId: 'r2', clearedTransactionIds: ['z'] },
      ]);
      expect(unverifies().map((c) => c[1])).toEqual([
        { params: { path: { id: 'r1' } }, body: { transactionIds: ['x', 'y'] } },
        { params: { path: { id: 'r2' } }, body: { transactionIds: ['z'] } },
      ]);
      expect(invalidate.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual(keys.rules.all);
    });

    it.each([[[]], [undefined]])('makes no unverify call when verifiedRules is %j', async (v) => {
      await approveThenUndo(v);
      expect(unverifies()).toHaveLength(0);
    });

    it('shows the error toast when an unverify fails', async () => {
      vi.mocked(api.POST).mockImplementation((async (path: string) => {
        if (path === '/api/v1/rules/{id}/unverify') throw new Error('nope');
        return { data: { succeededIds: ['a'], skippedIds: [], failures: [], verifiedRules: [{ ruleId: 'r1', clearedTransactionIds: ['x'] }] } };
      }) as never);
      const { result } = setup(() => useQuickApprove());
      await act(async () => {
        await result.current.quickApprove({ id: 'a', reviewReasons: ['CATEGORY_UNVERIFIED'] });
      });
      await act(async () => showToast.mock.calls[0][1].action.onSelect());
      expect(showToast).toHaveBeenLastCalledWith('Could not undo', { tone: 'danger' });
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
    expect(showToast).toHaveBeenCalledWith('Could not approve', { tone: 'danger' });
  });
});
