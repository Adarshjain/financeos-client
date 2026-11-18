import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiResult } from '@/lib/types';

import type { HoldingSection } from './holdingModel';
import { useSectionPage } from './useSectionPage';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: toast }));
vi.mock('@/lib/authExpiry', () => ({ watchSession: <T,>(p: Promise<T>) => p }));

type Row = { id: string };
const sec = (page: number, ...ids: string[]): HoldingSection<Row> => ({
  rows: ids.map((id) => ({ id })),
  position: { page, size: 2, totalElements: 6, totalPages: 3 },
});
const ok = (data: HoldingSection<Row>): ApiResult<HoldingSection<Row>> => ({ success: true, data }) as ApiResult<HoldingSection<Row>>;
const fail = (): ApiResult<HoldingSection<Row>> => ({ success: false, error: { message: 'down' } }) as unknown as ApiResult<HoldingSection<Row>>;
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};
const ids = (s: HoldingSection<Row>) => s.rows.map((r) => r.id);

describe('useSectionPage', () => {
  beforeEach(() => toast.mockClear());

  it('reload on page 0 does not load', async () => {
    const load = vi.fn();
    const { result } = renderHook(() => useSectionPage(sec(0, 'a', 'b'), load));
    await act(() => result.current.reload());
    expect(load).not.toHaveBeenCalled();
  });

  it('reload after goTo(1) fetches that page and shows the fresh rows', async () => {
    const load = vi.fn().mockResolvedValueOnce(ok(sec(1, 'c', 'd'))).mockResolvedValueOnce(ok(sec(1, 'c', 'd2')));
    const { result } = renderHook(() => useSectionPage(sec(0, 'a', 'b'), load));
    await act(() => result.current.goTo(1));
    await act(() => result.current.reload());
    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenLastCalledWith(1);
    expect(ids(result.current.section)).toEqual(['c', 'd2']);
  });

  it('drops a reload result that arrives after initial changed', async () => {
    const slow = deferred<ApiResult<HoldingSection<Row>>>();
    const load = vi.fn().mockResolvedValueOnce(ok(sec(1, 'c', 'd'))).mockReturnValueOnce(slow.promise);
    const { result, rerender } = renderHook(({ initial }) => useSectionPage(initial, load), { initialProps: { initial: sec(0, 'a', 'b') } });
    await act(() => result.current.goTo(1));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.reload();
    });
    rerender({ initial: sec(0, 'x', 'y') });
    await act(async () => {
      slow.resolve(ok(sec(1, 'stale')));
      await pending;
    });
    expect(ids(result.current.section)).toEqual(['x', 'y']);
  });

  it('drops a reload result that arrives after a later goTo', async () => {
    const slow = deferred<ApiResult<HoldingSection<Row>>>();
    const load = vi.fn().mockResolvedValueOnce(ok(sec(1, 'c', 'd'))).mockReturnValueOnce(slow.promise).mockResolvedValueOnce(ok(sec(2, 'e', 'f')));
    const { result } = renderHook(() => useSectionPage(sec(0, 'a', 'b'), load));
    await act(() => result.current.goTo(1));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.reload();
    });
    await act(() => result.current.goTo(2));
    await act(async () => {
      slow.resolve(ok(sec(1, 'stale')));
      await pending;
    });
    expect(ids(result.current.section)).toEqual(['e', 'f']);
  });

  it('a failed reload is silent and keeps the rows', async () => {
    const load = vi.fn().mockResolvedValueOnce(ok(sec(1, 'c', 'd'))).mockResolvedValueOnce(fail());
    const { result } = renderHook(() => useSectionPage(sec(0, 'a', 'b'), load));
    await act(() => result.current.goTo(1));
    await act(() => result.current.reload());
    expect(toast).not.toHaveBeenCalled();
    expect(ids(result.current.section)).toEqual(['c', 'd']);
  });

  it('a failed goTo still toasts', async () => {
    const load = vi.fn().mockResolvedValueOnce(fail());
    const { result } = renderHook(() => useSectionPage(sec(0, 'a', 'b'), load));
    await act(() => result.current.goTo(1));
    expect(toast).toHaveBeenCalledWith('down', { tone: 'danger' });
  });

  it('keeps the page on a same-data re-render and resets when initial changed', async () => {
    const load = vi.fn().mockResolvedValueOnce(ok(sec(1, 'c', 'd')));
    const { result, rerender } = renderHook(({ initial }) => useSectionPage(initial, load), { initialProps: { initial: sec(0, 'a', 'b') } });
    await act(() => result.current.goTo(1));
    rerender({ initial: sec(0, 'a', 'b') });
    expect(ids(result.current.section)).toEqual(['c', 'd']);
    rerender({ initial: sec(0, 'a', 'z') });
    expect(ids(result.current.section)).toEqual(['a', 'z']);
  });
});
