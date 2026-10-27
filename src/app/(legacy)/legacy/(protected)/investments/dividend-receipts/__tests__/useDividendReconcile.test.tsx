import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import { createTestQueryClient } from '@/test/renderWithQuery';

import { canRecordTds, useDividendReconcile } from '../useDividendReconcile';
import { makeCandidate, makeDividend, makeTxn } from './fixtures';

const REC = '/api/v1/investments/dividends/reconciliation';
const CONFIRM = '/api/v1/investments/dividends/reconciliation/confirm';

const item1 = {
  dividend: makeDividend({ id: 'd1' }),
  candidates: [
    makeCandidate({ transaction: makeTxn({ id: 'tx-a' }) }),
    makeCandidate({ transaction: makeTxn({ id: 'tx-b' }), tier: 'FUZZY' }),
  ],
};
const item2 = {
  dividend: makeDividend({ id: 'd2', tds: 50 }),
  candidates: [makeCandidate({ transaction: makeTxn({ id: 'tx-c' }), impliedTds: 100 })],
};
const item3 = {
  dividend: makeDividend({ id: 'd3' }),
  candidates: [makeCandidate({ transaction: makeTxn({ id: 'tx-d' }), impliedTds: 100 })],
};

function setup(items = [item1, item2, item3], opts: { brokerAccountId?: string; onLinked?: () => void } = {}) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  vi.mocked(api.GET).mockResolvedValue({
    data: { items, coverageEnd: '2026-03-31', unresolvedCount: 7, withCandidates: items.length },
  } as never);
  const hook = renderHook(() => useDividendReconcile(opts), { wrapper });
  return { ...hook, queryClient };
}

async function fetchMatches(result: ReturnType<typeof setup>['result']) {
  await act(async () => {
    await result.current.refetch();
  });
  await waitFor(() => expect(result.current.fetched).toBe(true));
}

describe('canRecordTds', () => {
  it('requires an implied TDS and a dividend without recorded TDS', () => {
    expect(canRecordTds(item3, item3.candidates[0])).toBe(true);
    expect(canRecordTds(item2, item2.candidates[0])).toBe(false); // already has tds
    expect(canRecordTds(item1, item1.candidates[0])).toBe(false); // no impliedTds
    expect(canRecordTds(item1, undefined)).toBe(false);
  });
});

describe('useDividendReconcile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not fetch until asked, then loads items + meta', async () => {
    const { result } = setup();
    expect(api.GET).not.toHaveBeenCalled();
    expect(result.current.fetched).toBe(false);
    expect(result.current.meta).toBeNull();

    await fetchMatches(result);
    expect(api.GET).toHaveBeenCalledWith(REC, { params: { query: {} } });
    expect(result.current.fetched).toBe(true);
    expect(result.current.items).toHaveLength(3);
    expect(result.current.meta).toEqual({ coverageEnd: '2026-03-31', unresolvedCount: 7, withCandidates: 3 });
  });

  it('scopes the query by broker and uses the broker-scoped cache key', async () => {
    const { result, queryClient } = setup([item1], { brokerAccountId: 'broker-9' });
    await fetchMatches(result);
    expect(api.GET).toHaveBeenCalledWith(REC, { params: { query: { brokerAccountId: 'broker-9' } } });
    expect(queryClient.getQueryData(keys.investments.dividendReconciliation({ brokerAccountId: 'broker-9' }))).toBeDefined();
  });

  it('defaults to the best candidate and lets the user override', async () => {
    const { result } = setup();
    await fetchMatches(result);
    expect(result.current.selected).toEqual({ d1: 'tx-a', d2: 'tx-c', d3: 'tx-d' });

    act(() => result.current.select('d1', 'tx-b'));
    expect(result.current.selected.d1).toBe('tx-b');
    expect(result.current.selectedCandidate(item1)?.tier).toBe('FUZZY');
  });

  it('ignores an override that is no longer one of the candidates', async () => {
    const { result, queryClient } = setup();
    await fetchMatches(result);
    act(() => result.current.select('d1', 'tx-b'));
    expect(result.current.selected.d1).toBe('tx-b');

    vi.mocked(api.GET).mockResolvedValue({
      data: { items: [{ ...item1, candidates: [item1.candidates[0]] }], coverageEnd: null, unresolvedCount: 1, withCandidates: 1 },
    } as never);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.selected.d1).toBe('tx-a');
    expect(queryClient).toBeDefined();
  });

  it('clears overrides and TDS overrides after a successful confirm', async () => {
    const { result } = setup();
    await fetchMatches(result);
    act(() => result.current.select('d1', 'tx-b'));
    act(() => result.current.setRecordTds('d3', false));
    vi.mocked(api.POST).mockResolvedValue({ data: { linked: [], skipped: [] } } as never);
    await act(async () => {
      await result.current.confirmOne('d1');
    });
    expect(result.current.selected.d1).toBe('tx-a');
    expect(result.current.recordTds(item3)).toBe(true);
  });

  it('exposes isError when the query fails', async () => {
    const { result } = setup();
    vi.mocked(api.GET).mockRejectedValue(new Error('boom'));
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.items).toEqual([]);
  });

  it('offers + defaults the TDS checkbox only for implied TDS on a dividend without TDS', async () => {
    const { result } = setup();
    await fetchMatches(result);
    expect(result.current.tdsOffered(item1)).toBe(false);
    expect(result.current.tdsOffered(item2)).toBe(false);
    expect(result.current.tdsOffered(item3)).toBe(true);
    expect(result.current.recordTds(item3)).toBe(true);
    expect(result.current.recordTds(item1)).toBe(false);

    act(() => result.current.setRecordTds('d3', false));
    expect(result.current.recordTds(item3)).toBe(false);
  });

  it('confirmOne posts exactly that row with its TDS state, toasts, invalidates and refetches', async () => {
    const onLinked = vi.fn();
    const { result, queryClient } = setup(undefined, { onLinked });
    await fetchMatches(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(api.POST).mockResolvedValue({ data: { linked: [makeDividend({ id: 'd3' })], skipped: [] } } as never);
    act(() => result.current.setRecordTds('d3', false));
    vi.mocked(api.GET).mockClear();

    await act(async () => {
      await result.current.confirmOne('d3');
    });

    expect(api.POST).toHaveBeenCalledWith(CONFIRM, {
      body: { items: [{ dividendId: 'd3', transactionId: 'tx-d', updateTds: false }] },
    });
    expect(toast.success).toHaveBeenCalledWith('Linked 1 of 1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.investments.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(api.GET).toHaveBeenCalledWith(REC, expect.anything()); // refetched
    expect(onLinked).toHaveBeenCalledTimes(1);
    expect(result.current.confirmingId).toBeNull();
  });

  it('confirmAll posts every row with the selected candidate and TDS state', async () => {
    const { result } = setup();
    await fetchMatches(result);
    act(() => result.current.select('d1', 'tx-b'));
    vi.mocked(api.POST).mockResolvedValue({ data: { linked: [makeDividend(), makeDividend(), makeDividend()], skipped: [] } } as never);

    await act(async () => {
      await result.current.confirmAll();
    });

    expect(api.POST).toHaveBeenCalledWith(CONFIRM, {
      body: {
        items: [
          { dividendId: 'd1', transactionId: 'tx-b', updateTds: false },
          { dividendId: 'd2', transactionId: 'tx-c', updateTds: false },
          { dividendId: 'd3', transactionId: 'tx-d', updateTds: true },
        ],
      },
    });
    expect(toast.success).toHaveBeenCalledWith('Linked 3 of 3');
    expect(result.current.confirmingAll).toBe(false);
  });

  it('confirmAll does nothing with no items', async () => {
    const { result } = setup([]);
    await fetchMatches(result);
    await act(async () => {
      await result.current.confirmAll();
    });
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('confirmOne ignores unknown dividend ids', async () => {
    const { result } = setup();
    await fetchMatches(result);
    await act(async () => {
      await result.current.confirmOne('nope');
    });
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('surfaces up to 3 skipped reasons then "+k more"', async () => {
    const { result } = setup();
    await fetchMatches(result);
    vi.mocked(api.POST).mockResolvedValue({
      data: {
        linked: [makeDividend()],
        skipped: [1, 2, 3, 4, 5].map((n) => ({ dividendId: `d${n}`, reason: `reason ${n}` })),
      },
    } as never);

    await act(async () => {
      await result.current.confirmAll();
    });

    expect(toast.success).toHaveBeenCalledWith('Linked 1 of 3');
    expect(toast.error).toHaveBeenCalledTimes(4);
    expect(toast.error).toHaveBeenNthCalledWith(1, 'reason 1');
    expect(toast.error).toHaveBeenNthCalledWith(3, 'reason 3');
    expect(toast.error).toHaveBeenNthCalledWith(4, '+2 more');
  });

  it('shows exactly the skipped reasons when there are 3 or fewer (no "more" toast)', async () => {
    const { result } = setup();
    await fetchMatches(result);
    vi.mocked(api.POST).mockResolvedValue({
      data: { linked: [], skipped: [{ dividendId: 'd1', reason: 'already linked' }] },
    } as never);
    await act(async () => {
      await result.current.confirmAll();
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('already linked');
  });

  it('reports a failed request via toastError and clears the busy state', async () => {
    const { result } = setup();
    await fetchMatches(result);
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    await act(async () => {
      await result.current.confirmOne('d1');
    });
    expect(toastError).toHaveBeenCalled();
    await waitFor(() => expect(result.current.confirmingId).toBeNull());
  });
});
