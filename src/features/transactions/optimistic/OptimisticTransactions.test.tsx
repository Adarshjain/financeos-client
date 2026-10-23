import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

import { DEFAULT_QUERY } from '../list/transactionsUrl';
import { approveChange, patchChange } from './optimisticModel';
import { useOptimisticLayer } from './OptimisticTransactions';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const t = (over: Partial<Transaction>): Transaction =>
  ({ id: 'a', accountId: 'a1', date: '2026-10-12', amount: -1, description: 'A', source: 'manual', reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED'], createdAt: '', ...over }) as Transaction;

function setup(initial: Transaction[]) {
  const qc = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  const props = (transactions: Transaction[]) => ({
    transactions,
    list: { ok: true as const, rows: [], totalElements: transactions.length, totalPages: 1 },
    accounts: null,
    query: DEFAULT_QUERY,
    needsReviewCount: null,
  });
  const hook = renderHook((p: ReturnType<typeof props>) => useOptimisticLayer(p), { wrapper, initialProps: props(initial) });
  return { qc, props, ...hook };
}

beforeEach(() => vi.clearAllMocks());

describe('useOptimisticLayer', () => {
  it('shows a change, keeps it once settled, and drops it when a new page arrives; one still in flight stays', () => {
    const first = [t({})];
    const { result, rerender, props } = setup(first);
    let a!: ReturnType<typeof result.current.api.begin>;
    let b!: ReturnType<typeof result.current.api.begin>;
    act(() => {
      a = result.current.api.begin(patchChange('a', { description: 'one' }));
      b = result.current.api.begin(patchChange('a', { description: 'two' }));
    });
    expect(result.current.transactions[0].description).toBe('two');
    act(() => a.settle(true));
    rerender(props([t({ description: 'one' })]));
    // a is in the page now; b is still waiting and still shows.
    expect(result.current.transactions[0].description).toBe('two');
    act(() => b.settle(false));
    expect(result.current.transactions[0].description).toBe('one');
  });

  it('reads the page again after a failure, once nothing is in flight', () => {
    const { result } = setup([t({})]);
    let a!: ReturnType<typeof result.current.api.begin>;
    let b!: ReturnType<typeof result.current.api.begin>;
    act(() => {
      a = result.current.api.begin(patchChange('a', { description: 'x' }));
      b = result.current.api.begin(patchChange('a', { description: 'y' }));
    });
    act(() => a.settle(false));
    expect(refresh).not.toHaveBeenCalled();
    act(() => b.settle(false));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('sends writes to one row in order, and each one sees only the changes before it', async () => {
    const { result } = setup([t({})]);
    const order: string[] = [];
    let release!: () => void;
    let a!: ReturnType<typeof result.current.api.begin>;
    let b!: ReturnType<typeof result.current.api.begin>;
    act(() => {
      a = result.current.api.begin(approveChange(['a'], ['UNRECONCILED']));
      b = result.current.api.begin(patchChange('a', { description: 'later' }));
    });
    const sentA = a.send(() => new Promise<void>((res) => (release = () => { order.push('a'); res(); })));
    const sentB = b.send(async () => { order.push('b'); });
    await Promise.resolve();
    expect(order).toEqual([]);
    expect(b.base('a')).toMatchObject({ reviewType: 'MANUALLY_REVIEWED', description: 'A' });
    expect(a.base('a')).toMatchObject({ reviewType: 'NEEDS_REVIEW' });
    release();
    await Promise.all([sentA, sentB]);
    expect(order).toEqual(['a', 'b']);
  });

  it('a failed earlier write does not stop the next one in line', async () => {
    const { result } = setup([t({})]);
    let a!: ReturnType<typeof result.current.api.begin>;
    let b!: ReturnType<typeof result.current.api.begin>;
    act(() => {
      a = result.current.api.begin(patchChange('a', { description: 'x' }));
      b = result.current.api.begin(patchChange('a', { description: 'y' }));
    });
    const failed = a.send(() => Promise.reject(new Error('boom'))).catch(() => 'failed');
    const next = b.send(async () => 'sent');
    expect(await failed).toBe('failed');
    expect(await next).toBe('sent');
  });

  it('changes the detail of a transaction opened from a link (not on the page) and puts it back on failure', () => {
    const { result, qc } = setup([t({})]);
    const linked = t({ id: 'z', description: 'Linked' });
    qc.setQueryData(keys.transactions.byId('z'), linked);
    let h!: ReturnType<typeof result.current.api.begin>;
    act(() => {
      h = result.current.api.begin(patchChange('z', { description: 'Edited' }));
    });
    expect(qc.getQueryData<Transaction>(keys.transactions.byId('z'))?.description).toBe('Edited');
    expect(h.base('z')).toMatchObject({ description: 'Linked' });
    act(() => h.settle(false));
    expect(qc.getQueryData(keys.transactions.byId('z'))).toEqual(linked);
  });
});
