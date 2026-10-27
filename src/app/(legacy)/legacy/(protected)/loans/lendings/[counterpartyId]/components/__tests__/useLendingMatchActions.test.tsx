import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import { useLendingMatchActions } from '../useLendingMatchActions';

type TransactionResponse = Schemas['TransactionResponse'];
type LendingMatchSuggestion = Schemas['LendingMatchSuggestion'];

function makeCandidate(overrides: Partial<TransactionResponse> = {}): TransactionResponse {
  return {
    id: 'tx-1',
    accountId: 'acc1',
    amount: -500,
    categories: [],
    createdAt: '2026-01-01T00:00:00Z',
    date: '2026-01-01',
    isTransactionExcluded: false,
    isTransactionUnderMonitoring: false,
    links: [],
    obligationRefs: [],
    reviewReasons: [],
    source: 'manual',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSuggestion(overrides: Partial<LendingMatchSuggestion> = {}): LendingMatchSuggestion {
  return {
    amount: 500,
    candidates: [makeCandidate()],
    direction: 'lent',
    entryDate: '2026-01-01',
    lendingId: 'l1',
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, invalidateSpy };
}

/** Triggers the lazy query and waits for the fetch to actually commit into the
 *  hook's render output before the caller inspects derived state — the
 *  observer's notification can land a tick after `refetch()`'s own promise
 *  resolves, so asserting immediately after `act()` is flaky. */
async function refetchAndSettle(result: { current: ReturnType<typeof useLendingMatchActions> }) {
  await act(async () => {
    await result.current.refetch();
  });
  await waitFor(() => expect(result.current.fetched).toBe(true));
}

describe('useLendingMatchActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch match suggestions before Find Matches is triggered (enabled: false)', () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useLendingMatchActions({ counterpartyId: 'cp1' }), { wrapper: Wrapper });

    expect(api.GET).not.toHaveBeenCalled();
  });

  it("defaults selected to each suggestion's first candidate after refetch", async () => {
    const s1 = makeSuggestion({ lendingId: 'l1', candidates: [makeCandidate({ id: 'c1' }), makeCandidate({ id: 'c2' })] });
    const s2 = makeSuggestion({ lendingId: 'l2', candidates: [makeCandidate({ id: 'c3' })] });
    vi.mocked(api.GET).mockResolvedValue({ data: { suggestions: [s1, s2] } } as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLendingMatchActions({ counterpartyId: 'cp1' }), { wrapper: Wrapper });

    await refetchAndSettle(result);

    expect(result.current.selected).toEqual({ l1: 'c1', l2: 'c3' });
  });

  it('lets select() override the default candidate for one lending', async () => {
    const s1 = makeSuggestion({ lendingId: 'l1', candidates: [makeCandidate({ id: 'c1' }), makeCandidate({ id: 'c2' })] });
    vi.mocked(api.GET).mockResolvedValue({ data: { suggestions: [s1] } } as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLendingMatchActions({ counterpartyId: 'cp1' }), { wrapper: Wrapper });

    await refetchAndSettle(result);

    act(() => result.current.select('l1', 'c2'));

    expect(result.current.selected.l1).toBe('c2');
  });

  it('confirmOne links the selected candidate for that lending, then refetches', async () => {
    const s1 = makeSuggestion({ lendingId: 'l1', candidates: [makeCandidate({ id: 'c1' })] });
    vi.mocked(api.GET).mockResolvedValue({ data: { suggestions: [s1] } } as never);
    vi.mocked(api.PUT).mockResolvedValue({ data: { id: 'l1' } } as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLendingMatchActions({ counterpartyId: 'cp1' }), { wrapper: Wrapper });

    await refetchAndSettle(result);
    const getCallsBefore = vi.mocked(api.GET).mock.calls.length;

    await act(async () => {
      await result.current.confirmOne('l1');
    });

    expect(api.PUT).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: 'l1' } },
      body: { transactionId: 'c1' },
    });
    expect(vi.mocked(api.GET).mock.calls.length).toBeGreaterThan(getCallsBefore);
  });

  it('confirmAll links every suggestion sequentially, tolerates one failure, and toasts "Linked N of M"', async () => {
    const s1 = makeSuggestion({ lendingId: 'l1', candidates: [makeCandidate({ id: 'c1' })] });
    const s2 = makeSuggestion({ lendingId: 'l2', candidates: [makeCandidate({ id: 'c2' })] });
    vi.mocked(api.GET).mockResolvedValue({ data: { suggestions: [s1, s2] } } as never);
    vi.mocked(api.PUT)
      .mockResolvedValueOnce({ data: { id: 'l1' } } as never)
      .mockRejectedValueOnce(new ApiError(400, { code: 'ERR', message: 'fail', timestamp: '' }) as never);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLendingMatchActions({ counterpartyId: 'cp1' }), { wrapper: Wrapper });

    await refetchAndSettle(result);

    await act(async () => {
      await result.current.confirmAll();
    });

    expect(api.PUT).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith('Linked 1 of 2');
  });

  it('invalidates lendings and transactions on a successful link', async () => {
    const s1 = makeSuggestion({ lendingId: 'l1', candidates: [makeCandidate({ id: 'c1' })] });
    vi.mocked(api.GET).mockResolvedValue({ data: { suggestions: [s1] } } as never);
    vi.mocked(api.PUT).mockResolvedValue({ data: { id: 'l1' } } as never);

    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useLendingMatchActions({ counterpartyId: 'cp1' }), { wrapper: Wrapper });

    await refetchAndSettle(result);

    await act(async () => {
      await result.current.confirmOne('l1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });
});
