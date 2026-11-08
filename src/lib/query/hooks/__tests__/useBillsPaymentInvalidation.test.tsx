import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({
  serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

import { serverApi as api } from '@/lib/api/server';
import { keys } from '@/lib/query/keys';

import { useBillMutations } from '../useBills';

describe('bill payment mutations refresh transactions and accounts', () => {
  beforeEach(() => vi.resetAllMocks());

  async function run(fn: (m: ReturnType<typeof useBillMutations>) => Promise<unknown>) {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useBillMutations(), {
      wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    });
    await act(async () => {
      await fn(result.current);
    });
    return spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);
  }

  it('mark paid with a payment invalidates transactions, accounts and the bills prefix that holds the candidates', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { statementId: 's1' } } as never);
    const invalidated = await run((m) =>
      m.markPaid.mutateAsync({ statementId: 's1', body: { payment: { mode: 'NEW' } } }),
    );
    expect(invalidated).toContainEqual(keys.transactions.all);
    expect(invalidated).toContainEqual(keys.accounts.all);
    expect(keys.bills.paymentCandidates('s1', null).slice(0, keys.bills.all.length)).toEqual([...keys.bills.all]);
    expect(invalidated).toContainEqual(keys.bills.all);
  });

  it('undo invalidates transactions and accounts too', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: { statementId: 's1' } } as never);
    const invalidated = await run((m) => m.unmarkPaid.mutateAsync('s1'));
    expect(invalidated).toContainEqual(keys.transactions.all);
    expect(invalidated).toContainEqual(keys.accounts.all);
  });
});
