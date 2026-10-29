import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLazyDialog } from './useLazyDialog';

const error = vi.hoisted(() => vi.fn());
vi.mock('@/lib/notify', () => ({ notify: { error } }));

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useLazyDialog', () => {
  beforeEach(() => error.mockClear());

  it('is loading while the import is pending, then opens once it resolves', async () => {
    const d = deferred<string>();
    const importer = vi.fn(() => d.promise);
    const { result } = renderHook(() => useLazyDialog(importer));
    const onReady = vi.fn();
    expect(result.current.Component).toBeNull();

    let done!: Promise<boolean>;
    act(() => {
      done = result.current.run(onReady);
    });
    expect(result.current.loading).toBe(true);
    expect(onReady).not.toHaveBeenCalled();

    await act(async () => {
      d.resolve('dialog');
      await done;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.Component).toBe('dialog');
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('does not import until it is pressed or preloaded', () => {
    const importer = vi.fn(() => Promise.resolve('x'));
    renderHook(() => useLazyDialog(importer));
    expect(importer).not.toHaveBeenCalled();
  });

  it('a preload on pointerdown shares the import with the click that follows', async () => {
    const importer = vi.fn(() => Promise.resolve('x'));
    const { result } = renderHook(() => useLazyDialog(importer));
    const onReady = vi.fn();
    act(() => result.current.preload());
    await act(async () => {
      await result.current.run(onReady);
    });
    expect(importer).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('opens at once the second time, without importing again or showing loading', async () => {
    const importer = vi.fn(() => Promise.resolve('x'));
    const { result } = renderHook(() => useLazyDialog(importer));
    await act(async () => {
      await result.current.run(() => undefined);
    });
    const onReady = vi.fn();
    act(() => {
      void result.current.run(onReady);
    });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('a new mount of an already loaded dialog starts with the component', async () => {
    const importer = vi.fn(() => Promise.resolve('x'));
    const first = renderHook(() => useLazyDialog(importer));
    await act(async () => {
      await first.result.current.run(() => undefined);
    });
    const second = renderHook(() => useLazyDialog(importer));
    expect(second.result.current.Component).toBe('x');
  });

  it('on a failed import stops loading, shows the error toast, never opens, and a later press retries', async () => {
    const importer = vi.fn().mockRejectedValueOnce(new Error('chunk')).mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useLazyDialog(importer));
    const onReady = vi.fn();
    let ok = true;
    await act(async () => {
      ok = await result.current.run(onReady);
    });
    expect(ok).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.Component).toBeNull();
    expect(onReady).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);

    await act(async () => {
      ok = await result.current.run(onReady);
    });
    expect(ok).toBe(true);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('a failed preload is swallowed', async () => {
    const importer = vi.fn(() => Promise.reject(new Error('chunk')));
    const { result } = renderHook(() => useLazyDialog(importer));
    act(() => result.current.preload());
    await act(async () => {
      await Promise.resolve();
    });
    expect(error).not.toHaveBeenCalled();
  });
});
