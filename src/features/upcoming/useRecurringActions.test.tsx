import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toast, toastError, act_ } = vi.hoisted(() => ({
  toast: vi.fn(),
  toastError: vi.fn(),
  act_: {
    trackRecurring: vi.fn(),
    dismissRecurring: vi.fn(),
    stopRecurring: vi.fn(),
    convertRecurring: vi.fn(),
  },
}));
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: (...a: unknown[]) => toast(...a) }));
vi.mock('@/lib/toastError', () => ({ toastError: (...a: unknown[]) => toastError(...a) }));
const ok = { ok: true, data: {} };
vi.mock('@/lib/query/actions/recurringActions', () => act_);
vi.mock('@/lib/actionResult', () => ({
  unwrapAction: async (p: Promise<{ ok: boolean; error?: unknown }>) => {
    const r = await p;
    if (!r.ok) throw r.error ?? new Error('fail');
    return r;
  },
}));

import { useRecurringActions } from './useRecurringActions';

function setup() {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useRecurringActions(), { wrapper }), spy };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const f of Object.values(act_)) f.mockResolvedValue(ok);
});

describe('useRecurringActions', () => {
  it('track calls the endpoint, toasts and refreshes proposals and obligations', async () => {
    const { result, spy } = setup();
    await act(() => result.current.track('r1', 'Netflix'));
    expect(act_.trackRecurring).toHaveBeenCalledWith('r1');
    expect(toast).toHaveBeenCalledWith('Tracking Netflix');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['recurring'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['obligations'] });
  });

  it('dismiss toasts the not-again line', async () => {
    const { result } = setup();
    await act(() => result.current.dismiss('r1', 'Netflix'));
    expect(act_.dismissRecurring).toHaveBeenCalledWith('r1');
    expect(toast).toHaveBeenCalledWith("Got it, we won't suggest Netflix again");
  });

  it('stop calls stop with no undo action', async () => {
    const { result } = setup();
    await act(() => result.current.stop('r1', 'Netflix'));
    expect(act_.stopRecurring).toHaveBeenCalledWith('r1');
    expect(toast).toHaveBeenCalledWith('Stopped tracking Netflix');
  });

  it('stop shows a loading toast, ignores a second call for the same series, and clears it after', async () => {
    let finish: (v: unknown) => void = () => {};
    act_.stopRecurring.mockReturnValueOnce(new Promise((r) => (finish = r)));
    const { result } = setup();
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.stop('r1', 'Netflix');
    });
    expect(await result.current.stop('r1', 'Netflix')).toBe(false);
    await act(async () => {
      finish(ok);
      await first;
    });
    expect(act_.stopRecurring).toHaveBeenCalledTimes(1);
    await act(() => result.current.stop('r1', 'Netflix'));
    expect(act_.stopRecurring).toHaveBeenCalledTimes(2);
  });

  it('converted posts the loan id without a toast', async () => {
    const { result, spy } = setup();
    await act(() => result.current.converted('r2', 'L9'));
    expect(act_.convertRecurring).toHaveBeenCalledWith('r2', 'L9');
    expect(toast).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('a failure shows the error and does not refresh', async () => {
    act_.trackRecurring.mockResolvedValue({ ok: false, error: new Error('x') });
    const { result, spy } = setup();
    await act(() => result.current.track('r1', 'Netflix'));
    expect(toastError).toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
