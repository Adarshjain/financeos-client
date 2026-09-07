import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import type { PagedInvestmentTransactionResponse } from '@/lib/types';

import { useTradebookSection } from '../useTradebookSection';

type Mock = ReturnType<typeof vi.fn>;

function pageOf(number: number, totalElements = 12, size = 10): PagedInvestmentTransactionResponse {
  const totalPages = Math.ceil(totalElements / size);
  return {
    content: [],
    totalElements,
    totalPages,
    size,
    number,
    first: number === 0,
    last: number === totalPages - 1,
    empty: false,
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// The search debounce (300ms) only resets the page when the search text actually changes.
// Its mount run used to call setPage(0) unconditionally, which undid a Next click made within
// 300ms of hydration (flaky tradebook pagination in CI).
describe('useTradebookSection search debounce vs. page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (api.GET as Mock).mockImplementation(async (_path: string, opts: { params: { query: { page: number } } }) => ({
      data: pageOf(opts.params.query.page),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a page change made right after mount survives the debounce timer', () => {
    const { result } = renderHook(() => useTradebookSection({ initialData: pageOf(0) }), {
      wrapper: makeWrapper(),
    });
    expect(result.current.page).toBe(0);

    act(() => result.current.setPage(1));
    expect(result.current.page).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.search).toBe('');
  });

  it('a new search text is applied after 300ms and resets to the first page', () => {
    const { result } = renderHook(() => useTradebookSection({ initialData: pageOf(0) }), {
      wrapper: makeWrapper(),
    });
    act(() => result.current.setPage(1));
    act(() => result.current.setSearchInput('  reliance '));

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current.search).toBe('');
    expect(result.current.page).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.search).toBe('reliance');
    expect(result.current.page).toBe(0);
  });

  it('input that trims to the current search does not reset the page', () => {
    const { result } = renderHook(() => useTradebookSection({ initialData: pageOf(0) }), {
      wrapper: makeWrapper(),
    });
    act(() => result.current.setPage(1));
    act(() => result.current.setSearchInput('   '));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.search).toBe('');
    expect(result.current.page).toBe(1);
  });

  it('typing keeps restarting the debounce; only the final text is applied', () => {
    const { result } = renderHook(() => useTradebookSection({ initialData: pageOf(0) }), {
      wrapper: makeWrapper(),
    });
    act(() => result.current.setSearchInput('r'));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => result.current.setSearchInput('re'));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.search).toBe('');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.search).toBe('re');
    expect(result.current.page).toBe(0);
  });
});
