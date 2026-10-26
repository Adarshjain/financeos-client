import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_SEARCH_RESULT, fetchGlobalSearch, type GlobalSearchResult } from './searchApi';
import { SEARCH_CACHE_SIZE, SEARCH_DEBOUNCE_MS, useGlobalSearch } from './useGlobalSearch';

vi.mock('./searchApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./searchApi')>()),
  fetchGlobalSearch: vi.fn(),
}));

const fetchMock = vi.mocked(fetchGlobalSearch);

function answer(name: string): GlobalSearchResult {
  return { ...EMPTY_SEARCH_RESULT, accounts: [{ id: name, name, bank: null, type: 'BANK', last4: null }] };
}

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (q) => answer(q));
});
afterEach(() => vi.useRealTimers());

describe('useGlobalSearch', () => {
  it('sends no request under 3 trimmed characters', async () => {
    const { result } = renderHook(({ q }) => useGlobalSearch(q), { initialProps: { q: '  ab ' } });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ result: null, loading: false });
  });

  it('waits for a pause in typing, then requests the trimmed text once', async () => {
    const { result, rerender } = renderHook(({ q }) => useGlobalSearch(q), { initialProps: { q: 'abc' } });
    expect(result.current.loading).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 50); });
    expect(fetchMock).not.toHaveBeenCalled();
    rerender({ q: ' abcd ' });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('abcd');
    expect(result.current.loading).toBe(false);
    expect(result.current.result?.accounts[0].name).toBe('abcd');
  });

  it('aborts the in-flight request when the query changes and ignores its answer', async () => {
    let resolveFirst: (r: GlobalSearchResult) => void = () => undefined;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    const { result, rerender } = renderHook(({ q }) => useGlobalSearch(q), { initialProps: { q: 'abc' } });
    await flush();
    const signal = fetchMock.mock.calls[0][1] as AbortSignal;
    expect(signal.aborted).toBe(false);

    rerender({ q: 'abcd' });
    expect(signal.aborted).toBe(true);
    await flush();
    await act(async () => resolveFirst(answer('stale')));

    expect(result.current.result?.accounts[0].name).toBe('abcd');
  });

  it('keeps the previous results (loading true) while the next query loads', async () => {
    const { result, rerender } = renderHook(({ q }) => useGlobalSearch(q), { initialProps: { q: 'abc' } });
    await flush();
    rerender({ q: 'abcd' });
    expect(result.current.loading).toBe(true);
    expect(result.current.result?.accounts[0].name).toBe('abc');
    await flush();
    expect(result.current.result?.accounts[0].name).toBe('abcd');
  });

  it('answers a repeated query from the cache without a new request', async () => {
    const { result, rerender } = renderHook(({ q }) => useGlobalSearch(q), { initialProps: { q: 'abc' } });
    await flush();
    rerender({ q: 'abcd' });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    rerender({ q: 'abc' });
    expect(result.current.loading).toBe(false);
    expect(result.current.result?.accounts[0].name).toBe('abc');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('drops the oldest cached answer after the cache is full', async () => {
    const { rerender } = renderHook(({ q }) => useGlobalSearch(q), { initialProps: { q: 'q00' } });
    await flush();
    for (let i = 1; i <= SEARCH_CACHE_SIZE; i++) {
      rerender({ q: `q${String(i).padStart(2, '0')}` });
      await flush();
    }
    expect(fetchMock).toHaveBeenCalledTimes(SEARCH_CACHE_SIZE + 1);
    rerender({ q: 'q00' });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(SEARCH_CACHE_SIZE + 2);
  });

  it('reads a failed request as no results and does not throw', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Search failed (500)'));
    const { result } = renderHook(() => useGlobalSearch('abc'));
    await flush();
    expect(result.current).toMatchObject({ result: EMPTY_SEARCH_RESULT, loading: false });
  });

  it('sends no request over 100 characters and shows no server results', async () => {
    const { result } = renderHook(() => useGlobalSearch('x'.repeat(101)));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ result: null, loading: false });
  });

  it('clears the results when the text drops under 3 characters', async () => {
    const { result, rerender } = renderHook(({ q }) => useGlobalSearch(q), { initialProps: { q: 'abc' } });
    await flush();
    rerender({ q: 'ab' });
    expect(result.current).toMatchObject({ result: null, loading: false });
  });

  it('reset forgets the cached answers and searches the current text again', async () => {
    const { result } = renderHook(() => useGlobalSearch('abc'));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockImplementation(async () => answer('fresh'));
    act(() => result.current.reset());
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.result?.accounts[0].name).toBe('fresh');
  });
});
