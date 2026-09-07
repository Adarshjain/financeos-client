import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { type PickerTransaction, useTransactionPicker } from '@/components/transactions/useTransactionPicker';
import { api } from '@/lib/api/client';
import { toCalendarDate } from '@/lib/utils';

type Mock = ReturnType<typeof vi.fn>;

function makeTxn(overrides: Partial<PickerTransaction> & { id: string }): PickerTransaction {
  return {
    accountId: 'acc-1',
    amount: -100,
    categories: [],
    createdAt: '2026-07-25T00:00:00Z',
    date: '2026-07-25',
    isTransactionExcluded: false,
    isTransactionUnderMonitoring: false,
    links: [],
    obligationRefs: [],
    reviewReasons: [],
    source: 'manual',
    updatedAt: '2026-07-25T00:00:00Z',
    description: 'Transaction',
    ...overrides,
  } as PickerTransaction;
}

function pagedResponse(content: PickerTransaction[]) {
  return {
    content,
    number: 0,
    size: 50,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

function lastSearchFilters() {
  const calls = (api.POST as Mock).mock.calls;
  const call = calls[calls.length - 1];
  return call[1].body.filters as { field: string; operator: string; value: unknown }[];
}

describe('useTransactionPicker request filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([]) });
  });

  it('filters by type DEBIT for the "lent" direction', async () => {
    renderHook(() => useTransactionPicker({ direction: 'lent', active: true }));

    await waitFor(() => expect(api.POST).toHaveBeenCalled());

    expect(lastSearchFilters()).toContainEqual({ field: 'type', operator: 'is', value: 'DEBIT' });
  });

  it('filters by type CREDIT for the "borrowed" direction', async () => {
    renderHook(() => useTransactionPicker({ direction: 'borrowed', active: true }));

    await waitFor(() => expect(api.POST).toHaveBeenCalled());

    expect(lastSearchFilters()).toContainEqual({ field: 'type', operator: 'is', value: 'CREDIT' });
  });

  it('adds a date "between" clause spanning ±30 days around suggestDate', async () => {
    renderHook(() =>
      useTransactionPicker({ direction: 'lent', suggestDate: '2026-07-25', active: true }),
    );

    await waitFor(() => expect(api.POST).toHaveBeenCalled());

    const anchor = new Date(2026, 6, 25);
    const from = new Date(anchor);
    from.setDate(from.getDate() - 30);
    const to = new Date(anchor);
    to.setDate(to.getDate() + 30);

    expect(lastSearchFilters()).toContainEqual({
      field: 'date',
      operator: 'between',
      value: { from: toCalendarDate(from), to: toCalendarDate(to) },
    });
  });

  it('omits the date clause when suggestDate is not provided', async () => {
    renderHook(() => useTransactionPicker({ direction: 'lent', active: true }));

    await waitFor(() => expect(api.POST).toHaveBeenCalled());

    expect(lastSearchFilters().some((f) => f.field === 'date')).toBe(false);
  });
});

describe('useTransactionPicker debounce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([]) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends exactly one request per settled query despite rapid typing', async () => {
    const { result } = renderHook(() => useTransactionPicker({ direction: 'lent', active: true }));

    // Mount schedules a debounce for the initial empty search; typing cancels
    // it and reschedules on every keystroke.
    act(() => result.current.setSearch('r'));
    await act(async () => vi.advanceTimersByTimeAsync(100));
    act(() => result.current.setSearch('ra'));
    await act(async () => vi.advanceTimersByTimeAsync(100));
    act(() => result.current.setSearch('rah'));

    // Only the final keystroke's timer should ever fire.
    await act(async () => vi.advanceTimersByTimeAsync(300));

    expect(api.POST).toHaveBeenCalledTimes(1);
    expect((api.POST as Mock).mock.calls[0][1].body.search).toBe('rah');
  });

  it('ignores a stale response that resolves after a newer request has already settled', async () => {
    let resolveStale: (value: unknown) => void = () => {};
    const stalePromise = new Promise((resolve) => {
      resolveStale = resolve;
    });
    const freshTxn = makeTxn({ id: 'fresh', description: 'Fresh Match' });
    const staleTxn = makeTxn({ id: 'stale', description: 'Stale Match' });

    (api.POST as Mock)
      .mockImplementationOnce(() => stalePromise)
      .mockImplementationOnce(() => Promise.resolve({ data: pagedResponse([freshTxn]) }));

    const { result } = renderHook(() => useTransactionPicker({ direction: 'lent', active: true }));

    // First (stale) request goes in flight from the initial mount.
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(api.POST).toHaveBeenCalledTimes(1);

    // Second request fires and resolves before the first one does.
    act(() => result.current.setSearch('fresh'));
    await act(async () => vi.advanceTimersByTimeAsync(300));

    expect(result.current.candidates.map((c) => c.id)).toEqual(['fresh']);

    // Now let the stale first request resolve — it must not override the
    // already-settled fresh results.
    await act(async () => {
      resolveStale({ data: pagedResponse([staleTxn]) });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.candidates.map((c) => c.id)).toEqual(['fresh']);
  });
});

describe('useTransactionPicker candidate filtering and sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides candidates that already carry a transaction<->transaction link', async () => {
    const linked = makeTxn({
      id: 'linked',
      links: [{ linkId: 'l1', type: 'TRANSFER', roleLabel: 'Transfer in', memberCount: 2 }],
    });
    const clean = makeTxn({ id: 'clean' });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([linked, clean]) });

    const { result } = renderHook(() => useTransactionPicker({ direction: 'lent', active: true }));

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['clean']);
    });
  });

  it('hides candidates already claimed by a non-LENDING obligation ref', async () => {
    const loanClaimed = makeTxn({
      id: 'loan-claimed',
      obligationRefs: [{ kind: 'LOAN_PAYMENT', id: 'op-1', label: 'EMI #2' }],
    });
    const clean = makeTxn({ id: 'clean' });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([loanClaimed, clean]) });

    const { result } = renderHook(() => useTransactionPicker({ direction: 'lent', active: true }));

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['clean']);
    });
  });

  it('keeps candidates that only carry a LENDING obligation ref (split-bill allowed)', async () => {
    const alreadySplit = makeTxn({
      id: 'split',
      obligationRefs: [{ kind: 'LENDING', id: 'op-2', label: 'Rahul Sharma' }],
    });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([alreadySplit]) });

    const { result } = renderHook(() => useTransactionPicker({ direction: 'lent', active: true }));

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['split']);
    });
  });

  it('hides candidates whose id is in excludeIds', async () => {
    const excluded = makeTxn({ id: 'excluded' });
    const kept = makeTxn({ id: 'kept' });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([excluded, kept]) });

    const { result } = renderHook(() =>
      useTransactionPicker({ direction: 'lent', excludeIds: ['excluded'], active: true }),
    );

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['kept']);
    });
  });

  it('sorts an exact |amount| match ahead of a mismatched one', async () => {
    const far = makeTxn({ id: 'far', amount: -900, date: '2026-07-25' });
    const exact = makeTxn({ id: 'exact', amount: -500, date: '2026-06-01' });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([far, exact]) });

    const { result } = renderHook(() =>
      useTransactionPicker({ direction: 'lent', suggestAmount: 500, active: true }),
    );

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['exact', 'far']);
    });
  });

  it('sorts by nearest date to suggestDate when amounts are tied', async () => {
    const farDate = makeTxn({ id: 'far-date', amount: -500, date: '2026-01-01' });
    const nearDate = makeTxn({ id: 'near-date', amount: -500, date: '2026-07-20' });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([farDate, nearDate]) });

    const { result } = renderHook(() =>
      useTransactionPicker({
        direction: 'lent',
        suggestAmount: 500,
        suggestDate: '2026-07-25',
        active: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['near-date', 'far-date']);
    });
  });

  it('falls back to date desc when there is nothing to suggest against', async () => {
    const older = makeTxn({ id: 'older', date: '2026-01-01' });
    const newer = makeTxn({ id: 'newer', date: '2026-07-25' });
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([older, newer]) });

    const { result } = renderHook(() => useTransactionPicker({ direction: 'lent', active: true }));

    await waitFor(() => {
      expect(result.current.candidates.map((c) => c.id)).toEqual(['newer', 'older']);
    });
  });
});
