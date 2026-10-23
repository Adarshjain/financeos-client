import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';

import { type PickerTransaction, useTransactionPicker } from './useTransactionPicker';

type Mock = ReturnType<typeof vi.fn>;

const txn = (id: string, date = '2026-10-01'): PickerTransaction =>
  ({
    id,
    accountId: 'a1',
    amount: -100,
    date,
    description: id,
    links: [],
    obligationRefs: [],
  }) as unknown as PickerTransaction;

const page = (content: PickerTransaction[], number: number, totalPages: number) => ({
  data: { content, number, size: 50, totalElements: totalPages * 50, totalPages },
});

const queries = () => (api.POST as Mock).mock.calls.map((c) => c[1].params.query.page as number);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTransactionPicker paging', () => {
  it('asks for the first page and reports the server page count and total', async () => {
    (api.POST as Mock).mockResolvedValue(page([txn('a')], 0, 3));
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    expect(queries()).toEqual([0]);
    expect(result.current.page).toBe(0);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.totalElements).toBe(150);
    expect(result.current.pageSize).toBe(50);
  });

  it('goes to another page and shows only that page rows', async () => {
    (api.POST as Mock)
      .mockResolvedValueOnce(page([txn('a')], 0, 2))
      .mockResolvedValueOnce(page([txn('b')], 1, 2));
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));

    act(() => result.current.setPage(1));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['b']));
    expect(queries()).toEqual([0, 1]);
    expect(result.current.page).toBe(1);
  });

  it('starts over from the first page when the search changes', async () => {
    (api.POST as Mock)
      .mockResolvedValueOnce(page([txn('a')], 0, 2))
      .mockResolvedValueOnce(page([txn('b')], 1, 2))
      .mockResolvedValueOnce(page([txn('c')], 0, 1));
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    act(() => result.current.setPage(1));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['b']));

    act(() => result.current.setSearch('emi'));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['c']));
    expect(queries()).toEqual([0, 1, 0]);
    expect((api.POST as Mock).mock.calls[2][1].body.search).toBe('emi');
    expect(result.current.page).toBe(0);
  });

  it('sends the debit / credit filter and starts over at page 0 when it changes', async () => {
    (api.POST as Mock).mockResolvedValue(page([txn('a')], 0, 2));
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    expect((api.POST as Mock).mock.calls[0][1].body.filters).toEqual([]);
    act(() => result.current.setPage(1));
    await waitFor(() => expect(result.current.page).toBe(1));
    await waitFor(() => expect(queries().at(-1)).toBe(1));

    act(() => result.current.setTypeFilter('debit'));
    await waitFor(() => expect(result.current.page).toBe(0));
    await waitFor(() => expect((api.POST as Mock).mock.calls.at(-1)![1].body.filters).toEqual([
      { field: 'type', operator: 'is', value: 'DEBIT' },
    ]));
    expect(queries().at(-1)).toBe(0);

    act(() => result.current.setTypeFilter('credit'));
    await waitFor(() => expect((api.POST as Mock).mock.calls.at(-1)![1].body.filters).toEqual([
      { field: 'type', operator: 'is', value: 'CREDIT' },
    ]));
    act(() => result.current.setTypeFilter('all'));
    await waitFor(() => expect((api.POST as Mock).mock.calls.at(-1)![1].body.filters).toEqual([]));
  });

  it('lets a type fixed by the caller win over the filter', async () => {
    (api.POST as Mock).mockResolvedValue(page([txn('a')], 0, 1));
    const { result } = renderHook(() => useTransactionPicker({ active: true, type: 'DEBIT' }));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    act(() => result.current.setTypeFilter('credit'));
    await waitFor(() => expect((api.POST as Mock).mock.calls.length).toBeGreaterThan(1));
    for (const c of (api.POST as Mock).mock.calls) {
      expect(c[1].body.filters).toEqual([{ field: 'type', operator: 'is', value: 'DEBIT' }]);
    }
  });

  it('does not ask while the picker is not showing', async () => {
    (api.POST as Mock).mockResolvedValue(page([], 0, 0));
    renderHook(() => useTransactionPicker({ active: false }));
    await new Promise((r) => setTimeout(r, 400));
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('starts over at page 0 when a typed search is deleted again after paging', async () => {
    (api.POST as Mock).mockImplementation((_path, init) => {
      const { page: n } = init.params.query;
      const searched = init.body.search;
      return Promise.resolve(page([txn(searched ? 'e0' : n === 0 ? 'a' : 'b')], n, 2));
    });
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['a']));
    act(() => result.current.setPage(1));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['b']));

    act(() => result.current.setSearch('e'));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['e0']));
    act(() => result.current.setSearch(''));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['a']));
    expect(queries().at(-1)).toBe(0);
    expect(result.current.page).toBe(0);
  });

  it('shows page 0 again, after closing and reopening following paging', async () => {
    (api.POST as Mock).mockImplementation((_path, init) => {
      const n = init.params.query.page as number;
      return Promise.resolve(page([txn(n === 0 ? 'a' : 'b')], n, 2));
    });
    const { result, rerender } = renderHook(({ active }) => useTransactionPicker({ active }), {
      initialProps: { active: true },
    });
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    act(() => result.current.setPage(1));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['b']));

    rerender({ active: false });
    rerender({ active: true });
    await waitFor(() => expect(queries().at(-1)).toBe(0));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['a']));
    expect(result.current.page).toBe(0);
  });

  it('fetches a page change, including back to the first page, without the typing pause', async () => {
    (api.POST as Mock).mockImplementation((_p, init) =>
      Promise.resolve(page([txn(`p${init.params.query.page}`)], init.params.query.page, 3)),
    );
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['p0']));
    vi.useFakeTimers({ shouldAdvanceTime: false });
    try {
      act(() => result.current.setPage(1));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(queries().at(-1)).toBe(1);
      act(() => result.current.setPage(0));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(queries().at(-1)).toBe(0);
      act(() => result.current.setTypeFilter('debit'));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect((api.POST as Mock).mock.calls.at(-1)![1].body.filters).toEqual([{ field: 'type', operator: 'is', value: 'DEBIT' }]);
      const before = (api.POST as Mock).mock.calls.length;
      act(() => result.current.setSearch('emi'));
      await act(async () => { await vi.advanceTimersByTimeAsync(100); });
      expect((api.POST as Mock).mock.calls.length).toBe(before);
      await act(async () => { await vi.advanceTimersByTimeAsync(300); });
      expect((api.POST as Mock).mock.calls.length).toBe(before + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops a late answer for an earlier filter so wrong-type rows never show', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    (api.POST as Mock).mockImplementation((_p, init) => {
      const filters = init.body.filters as unknown[];
      if (filters.length === 0) return new Promise((r) => { resolveFirst = r; });
      return Promise.resolve(page([txn('debit-row')], 0, 1));
    });
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    act(() => result.current.setTypeFilter('debit'));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['debit-row']));
    await act(async () => { resolveFirst(page([txn('credit-row')], 0, 1)); });
    expect(result.current.candidates.map((t) => t.id)).toEqual(['debit-row']);
  });

  it('clears the previous page rows when the next page fails to load', async () => {
    (api.POST as Mock)
      .mockResolvedValueOnce(page([txn('a')], 0, 2))
      .mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['a']));
    act(() => result.current.setPage(1));
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.page).toBe(1);
    expect(result.current.candidates).toEqual([]);
  });
});
