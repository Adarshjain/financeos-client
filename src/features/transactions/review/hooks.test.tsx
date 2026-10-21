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
    expect(showToast).toHaveBeenCalledWith('Approved 2 transactions', { tone: 'success' });
    expect(result.current.summary).toBeNull();
    const k = invalidate.mock.calls.map((c) => c[0]?.queryKey);
    expect(k).toEqual(expect.arrayContaining([keys.transactions.all, keys.transactions.needsReviewCount()]));
    expect(router.refresh).toHaveBeenCalled();
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
