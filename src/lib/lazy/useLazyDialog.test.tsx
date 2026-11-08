import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NAVIGATION_PROGRESS_DELAY_MS, resetBusy, useBusyShowing } from '@/lib/busy';

import { useLazyDialog } from './useLazyDialog';

const error = vi.hoisted(() => vi.fn());
vi.mock('@/lib/notify', () => ({ notify: { error } }));
const route = vi.hoisted(() => ({ pathname: '/a' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

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
  beforeEach(() => {
    error.mockClear();
    route.pathname = '/a';
  });

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

  describe('a slow chunk never opens late', () => {
    it('repeated taps open once: only the latest run fires', async () => {
      const d = deferred<string>();
      const importer = vi.fn(() => d.promise);
      const { result } = renderHook(() => useLazyDialog(importer));
      const first = vi.fn();
      const second = vi.fn();
      const third = vi.fn();
      let done!: Promise<boolean[]>;
      act(() => {
        done = Promise.all([result.current.run(first), result.current.run(second), result.current.run(third)]);
      });
      let ran: boolean[] = [];
      await act(async () => {
        d.resolve('dialog');
        ran = await done;
      });
      expect(ran).toEqual([false, false, true]);
      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
      expect(third).toHaveBeenCalledTimes(1);
      expect(result.current.loading).toBe(false);
    });

    it('cancel (the user closed it) drops the waiting run and stops loading', async () => {
      const d = deferred<string>();
      const importer = vi.fn(() => d.promise);
      const { result } = renderHook(() => useLazyDialog(importer));
      const onReady = vi.fn();
      let done!: Promise<boolean>;
      act(() => {
        done = result.current.run(onReady);
      });
      expect(result.current.loading).toBe(true);
      act(() => result.current.cancel());
      expect(result.current.loading).toBe(false);
      let ran = true;
      await act(async () => {
        d.resolve('dialog');
        ran = await done;
      });
      expect(ran).toBe(false);
      expect(onReady).not.toHaveBeenCalled();
      // The code still arrived and is cached: the next press opens at once.
      const next = vi.fn();
      act(() => {
        void result.current.run(next);
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('an unmount drops the waiting run', async () => {
      const d = deferred<string>();
      const importer = vi.fn(() => d.promise);
      const { result, unmount } = renderHook(() => useLazyDialog(importer));
      const onReady = vi.fn();
      let done!: Promise<boolean>;
      act(() => {
        done = result.current.run(onReady);
      });
      unmount();
      await act(async () => {
        d.resolve('dialog');
        await done;
      });
      expect(onReady).not.toHaveBeenCalled();
    });

    it('moving to another page drops the waiting run', async () => {
      const d = deferred<string>();
      const importer = vi.fn(() => d.promise);
      const { result, rerender } = renderHook(() => useLazyDialog(importer));
      const onReady = vi.fn();
      let done!: Promise<boolean>;
      act(() => {
        done = result.current.run(onReady);
      });
      route.pathname = '/b';
      rerender();
      expect(result.current.loading).toBe(false);
      await act(async () => {
        d.resolve('dialog');
        await done;
      });
      expect(onReady).not.toHaveBeenCalled();
    });
  });
  describe('top bar busy state', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      resetBusy();
      vi.useRealTimers();
    });
    const setup = (importer: () => Promise<string>) =>
      renderHook(() => ({ lazy: useLazyDialog(importer), busy: useBusyShowing() }));
    const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

    it('holds the busy bar while loading and releases it when the code arrives', async () => {
      const d = deferred<string>();
      const { result } = setup(() => d.promise);
      let done!: Promise<boolean>;
      act(() => {
        done = result.current.lazy.run(vi.fn());
      });
      wait(NAVIGATION_PROGRESS_DELAY_MS);
      expect(result.current.busy).toBe(true);
      await act(async () => {
        d.resolve('x');
        await done;
      });
      expect(result.current.busy).toBe(false);
    });

    it('releases the busy bar on a failed import', async () => {
      const d = deferred<string>();
      const { result } = setup(() => d.promise);
      let done!: Promise<boolean>;
      act(() => {
        done = result.current.lazy.run(vi.fn());
      });
      wait(NAVIGATION_PROGRESS_DELAY_MS);
      expect(result.current.busy).toBe(true);
      await act(async () => {
        d.reject(new Error('x'));
        await done;
      });
      expect(result.current.busy).toBe(false);
    });

    it('releases the busy bar on cancel', () => {
      const d = deferred<string>();
      const { result } = setup(() => d.promise);
      act(() => void result.current.lazy.run(vi.fn()));
      wait(NAVIGATION_PROGRESS_DELAY_MS);
      expect(result.current.busy).toBe(true);
      act(() => result.current.lazy.cancel());
      expect(result.current.busy).toBe(false);
    });

    it('releases the busy bar on unmount', () => {
      const d = deferred<string>();
      const probe = renderHook(() => useBusyShowing());
      const { result, unmount } = setup(() => d.promise);
      act(() => void result.current.lazy.run(vi.fn()));
      wait(NAVIGATION_PROGRESS_DELAY_MS);
      expect(probe.result.current).toBe(true);
      unmount();
      expect(probe.result.current).toBe(false);
    });
  });
});
