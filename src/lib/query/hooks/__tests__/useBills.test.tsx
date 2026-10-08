import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import type { CardBillResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import { useBillMutations, useBills } from '../useBills';

// gcTime Infinity: setQueryData on an observer-less entry must stay readable.
function wrapperFor(qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

describe('useBills', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('queries all cards with an empty query and the unscoped key', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [{ accountId: 'a' }] } as never);
    const { qc, Wrapper } = wrapperFor();
    const { result } = renderHook(() => useBills(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ accountId: 'a' }]));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/bills', { params: { query: {} } });
    expect(qc.getQueryData(keys.bills.list({}))).toBeDefined();
  });

  it('scopes the request and the cache key by accountId', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
    const { qc, Wrapper } = wrapperFor();
    const { result } = renderHook(() => useBills(undefined, { accountId: 'acc-1' }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/bills', { params: { query: { accountId: 'acc-1' } } });
    expect(qc.getQueryData(keys.bills.list({ accountId: 'acc-1' }))).toEqual([]);
    expect(qc.getQueryData(keys.bills.list({}))).toBeUndefined();
  });

  it('treats a null accountId as unscoped', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
    const { Wrapper } = wrapperFor();
    renderHook(() => useBills(undefined, { accountId: null }), { wrapper: Wrapper });
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(api.GET).toHaveBeenCalledWith('/api/v1/bills', { params: { query: {} } });
  });

  it('falls back to [] when the response has no data', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
    const { Wrapper } = wrapperFor();
    const { result } = renderHook(() => useBills(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));
  });
});

describe('useBillMutations invalidations', () => {
  const bill = { statementId: 's1', status: 'PAID' } as CardBillResponse;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function runAndCollect(run: (m: ReturnType<typeof useBillMutations>) => Promise<unknown>) {
    const { qc, Wrapper } = wrapperFor();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useBillMutations(), { wrapper: Wrapper });
    await act(async () => {
      await run(result.current);
    });
    return { qc, keysInvalidated: spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey) };
  }

  const expectAll = (invalidated: unknown[][]) => {
    expect(invalidated).toContainEqual(keys.bills.all);
    expect(invalidated).toContainEqual(keys.inbox.all);
    expect(invalidated).toContainEqual(keys.obligations.all);
    expect(invalidated).toContainEqual([...keys.dashboards.all, 'widget']);
  };

  it('markPaid invalidates bills, inbox, obligations and dashboard widgets, and seeds the statement entry', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: bill } as never);
    const { qc, keysInvalidated } = await runAndCollect((m) =>
      m.markPaid.mutateAsync({ statementId: 's1', body: { amount: 1 } as never }),
    );
    expectAll(keysInvalidated);
    expect(qc.getQueryData(keys.bills.byStatement('s1'))).toEqual(bill);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: 's1' } },
      body: { amount: 1 },
    });
  });

  it('markPaid with no body sends an empty object', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: bill } as never);
    await runAndCollect((m) => m.markPaid.mutateAsync({ statementId: 's1' }));
    expect(api.POST).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: 's1' } },
      body: {},
    });
  });

  it('unmarkPaid invalidates the same four prefixes', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: bill } as never);
    const { keysInvalidated } = await runAndCollect((m) => m.unmarkPaid.mutateAsync('s1'));
    expectAll(keysInvalidated);
  });

  it('updateDetails invalidates the same four prefixes', async () => {
    vi.mocked(api.PATCH).mockResolvedValue({ data: bill } as never);
    const { keysInvalidated } = await runAndCollect((m) =>
      m.updateDetails.mutateAsync({ statementId: 's1', body: {} as never }),
    );
    expectAll(keysInvalidated);
  });

  it('does not seed a statement entry when the bill has no statementId', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: { status: 'AWAITING_STATEMENT' } } as never);
    const { qc } = await runAndCollect((m) => m.unmarkPaid.mutateAsync('s1'));
    expect(qc.getQueryData(keys.bills.byStatement(''))).toBeUndefined();
  });
});
