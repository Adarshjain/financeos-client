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
  data: { content, number, size: 50, totalElements: content.length, totalPages },
});

const queries = () => (api.POST as Mock).mock.calls.map((c) => c[1].params.query.page as number);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTransactionPicker paging', () => {
  it('asks for the first page and offers more while there are more pages', async () => {
    (api.POST as Mock).mockResolvedValue(page([txn('a')], 0, 3));
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    expect(queries()).toEqual([0]);
    expect(result.current.hasMore).toBe(true);
  });

  it('loads the next page and adds its rows to the list', async () => {
    (api.POST as Mock)
      .mockResolvedValueOnce(page([txn('a')], 0, 2))
      .mockResolvedValueOnce(page([txn('b')], 1, 2));
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.candidates.map((t) => t.id).sort()).toEqual(['a', 'b']));
    expect(queries()).toEqual([0, 1]);
    expect(result.current.hasMore).toBe(false);
  });

  it('starts over from the first page when the search changes', async () => {
    (api.POST as Mock)
      .mockResolvedValueOnce(page([txn('a')], 0, 2))
      .mockResolvedValueOnce(page([txn('b')], 1, 2))
      .mockResolvedValueOnce(page([txn('c')], 0, 1));
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.candidates).toHaveLength(2));

    act(() => result.current.setSearch('emi'));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['c']));
    expect(queries()).toEqual([0, 1, 0]);
    expect((api.POST as Mock).mock.calls[2][1].body.search).toBe('emi');
    expect(result.current.hasMore).toBe(false);
  });

  it('does not ask while the picker is not showing', async () => {
    (api.POST as Mock).mockResolvedValue(page([], 0, 0));
    renderHook(() => useTransactionPicker({ active: false }));
    await new Promise((r) => setTimeout(r, 400));
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('starts over at page 0 when a typed search is deleted again after Show more', async () => {
    (api.POST as Mock).mockImplementation((_path, init) => {
      const { page: n } = init.params.query;
      const searched = init.body.search;
      return Promise.resolve(page([txn(searched ? 'e0' : n === 0 ? 'a' : 'b')], n, 2));
    });
    const { result } = renderHook(() => useTransactionPicker({ active: true }));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['a']));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.candidates).toHaveLength(2));

    act(() => result.current.setSearch('e'));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['e0']));
    act(() => result.current.setSearch(''));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['a']));
    expect(queries().at(-1)).toBe(0);
    expect(result.current.hasMore).toBe(true);
  });

  it('shows page 0 again, with no duplicates, after closing and reopening following Show more', async () => {
    (api.POST as Mock).mockImplementation((_path, init) => {
      const n = init.params.query.page as number;
      return Promise.resolve(page([txn(n === 0 ? 'a' : 'b')], n, 2));
    });
    const { result, rerender } = renderHook(({ active }) => useTransactionPicker({ active }), {
      initialProps: { active: true },
    });
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.candidates).toHaveLength(2));

    rerender({ active: false });
    rerender({ active: true });
    await waitFor(() => expect(queries().at(-1)).toBe(0));
    await waitFor(() => expect(result.current.candidates.map((t) => t.id)).toEqual(['a']));
    expect(result.current.hasMore).toBe(true);
  });
});
