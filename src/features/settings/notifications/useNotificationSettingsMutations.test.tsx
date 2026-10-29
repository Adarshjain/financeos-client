import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions behind the hooks run `serverApi`; the tests drive it through the same mock shape.
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

import { serverApi as api } from '@/lib/api/server';
import type { NotificationSettingsResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import { useNotificationSettingsMutations } from './useNotificationSettings';

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useNotificationSettingsMutations(), { wrapper });
}

describe('useNotificationSettingsMutations router (the settings are a query, so nothing refreshes it)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.PUT).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: {} } as never);
  });

  it('does not refresh the router for any settings write, including mutes', async () => {
    const { result } = setup();
    await act(() => result.current.update.mutateAsync({} as never));
    await act(() => result.current.subscribe.mutateAsync({} as never));
    await act(() => result.current.unsubscribe.mutateAsync('https://push/e'));
    await act(() => result.current.mute.mutateAsync({ accountId: 'a1', muted: true }));
    await act(() => result.current.muteLoan.mutateAsync({ loanId: 'l1', muted: true }));
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('does not refresh for the test push', async () => {
    const { result } = setup();
    await act(() => result.current.sendTest.mutateAsync());
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});

const base = {
  kinds: { EMI_OVERDUE: true },
  mutedAccountIds: ['a0'],
  mutedLoanIds: [],
  reminderOffsets: [1],
  sendHour: 9,
} as unknown as NotificationSettingsResponse;

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setupSeeded() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData(keys.settings.notifications(), base);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useNotificationSettingsMutations(), { wrapper });
  const cached = () => qc.getQueryData<NotificationSettingsResponse>(keys.settings.notifications())!;
  return { ...hook, cached };
}

describe('useNotificationSettingsMutations optimistic switches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('moves a kind switch before the request resolves and keeps it on success', async () => {
    const d = deferred<{ data: NotificationSettingsResponse }>();
    vi.mocked(api.PUT).mockReturnValue(d.promise as never);
    const { result, cached } = setupSeeded();
    let p!: Promise<unknown>;
    act(() => {
      p = result.current.update.mutateAsync({ kinds: { EMI_OVERDUE: false } });
    });
    await vi.waitFor(() => expect(cached().kinds.EMI_OVERDUE).toBe(false));
    expect(routerRefresh).not.toHaveBeenCalled();
    await act(async () => {
      d.resolve({ data: { ...base, kinds: { EMI_OVERDUE: false } } });
      await p;
    });
    expect(cached().kinds.EMI_OVERDUE).toBe(false);
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('puts a kind switch back when the save fails', async () => {
    vi.mocked(api.PUT).mockRejectedValue(new Error('boom'));
    const { result, cached } = setupSeeded();
    await act(async () => {
      await result.current.update.mutateAsync({ kinds: { EMI_OVERDUE: false } }).catch(() => undefined);
    });
    expect(cached().kinds.EMI_OVERDUE).toBe(true);
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('does not move anything for a non-switch field (it keeps waiting)', async () => {
    const d = deferred<{ data: NotificationSettingsResponse }>();
    vi.mocked(api.PUT).mockReturnValue(d.promise as never);
    const { result, cached } = setupSeeded();
    act(() => {
      void result.current.update.mutateAsync({ sendHour: 18 });
    });
    await vi.waitFor(() => expect(result.current.update.isPending).toBe(true));
    expect(cached().sendHour).toBe(9);
  });

  it('moves and rolls back a card mute and a loan mute', async () => {
    vi.mocked(api.PUT).mockRejectedValue(new Error('boom'));
    const { result, cached } = setupSeeded();
    await act(async () => {
      await result.current.mute.mutateAsync({ accountId: 'a1', muted: true }).catch(() => undefined);
      await result.current.mute.mutateAsync({ accountId: 'a0', muted: false }).catch(() => undefined);
      await result.current.muteLoan.mutateAsync({ loanId: 'l1', muted: true }).catch(() => undefined);
    });
    expect(cached().mutedAccountIds).toEqual(['a0']);
    expect(cached().mutedLoanIds).toEqual([]);

    const d = deferred<{ data: NotificationSettingsResponse }>();
    vi.mocked(api.PUT).mockReturnValue(d.promise as never);
    act(() => {
      void result.current.mute.mutateAsync({ accountId: 'a1', muted: true });
      void result.current.muteLoan.mutateAsync({ loanId: 'l1', muted: true });
    });
    await vi.waitFor(() => {
      expect(cached().mutedAccountIds).toEqual(['a0', 'a1']);
      expect(cached().mutedLoanIds).toEqual(['l1']);
    });
  });

  it('keeps a second toggle when the first one fails, ', async () => {
    const first = deferred<never>();
    const second = deferred<{ data: NotificationSettingsResponse }>();
    vi.mocked(api.PUT)
      .mockReturnValueOnce(first.promise as never)
      .mockReturnValueOnce(second.promise as never);
    const { result, cached } = setupSeeded();
    let p1!: Promise<unknown>;
    let p2!: Promise<unknown>;
    act(() => {
      p1 = result.current.update.mutateAsync({ kinds: { EMI_OVERDUE: false } }).catch(() => undefined);
    });
    await vi.waitFor(() => expect(cached().kinds.EMI_OVERDUE).toBe(false));
    act(() => {
      p2 = result.current.update.mutateAsync({ kinds: { BILL_OVERDUE: false } });
    });
    await vi.waitFor(() => expect(cached().kinds.BILL_OVERDUE).toBe(false));
    await act(async () => {
      first.reject(new Error('boom'));
      await p1;
    });
    expect(cached().kinds).toEqual({ EMI_OVERDUE: true, BILL_OVERDUE: false });
    await act(async () => {
      second.resolve({ data: { ...base, kinds: { EMI_OVERDUE: true, BILL_OVERDUE: false } } });
      await p2;
    });
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('a response only touches its own switch: a late answer for one kind never undoes another still in flight', async () => {
    const first = deferred<{ data: NotificationSettingsResponse }>();
    const second = deferred<{ data: NotificationSettingsResponse }>();
    vi.mocked(api.PUT)
      .mockReturnValueOnce(first.promise as never)
      .mockReturnValueOnce(second.promise as never);
    const { result, cached } = setupSeeded();
    let p1!: Promise<unknown>;
    act(() => {
      p1 = result.current.update.mutateAsync({ kinds: { EMI_OVERDUE: false } });
    });
    await vi.waitFor(() => expect(cached().kinds.EMI_OVERDUE).toBe(false));
    act(() => {
      void result.current.update.mutateAsync({ kinds: { BILL_OVERDUE: false } });
    });
    await vi.waitFor(() => expect(cached().kinds.BILL_OVERDUE).toBe(false));
    // The first answer was computed before the second write: it still says BILL_OVERDUE is on.
    await act(async () => {
      first.resolve({ data: { ...base, kinds: { EMI_OVERDUE: false, BILL_OVERDUE: true } } });
      await p1;
    });
    expect(cached().kinds).toEqual({ EMI_OVERDUE: false, BILL_OVERDUE: false });
    expect(routerRefresh).not.toHaveBeenCalled();
    await act(async () => {
      second.resolve({ data: { ...base, kinds: { EMI_OVERDUE: false, BILL_OVERDUE: false } } });
    });
    await vi.waitFor(() => expect(cached().kinds.BILL_OVERDUE).toBe(false));
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('two toggles of one switch that both fail end at the server value', async () => {
    const first = deferred<never>();
    const second = deferred<never>();
    vi.mocked(api.PUT)
      .mockReturnValueOnce(first.promise as never)
      .mockReturnValueOnce(second.promise as never);
    const { result, cached } = setupSeeded();
    let p1!: Promise<unknown>;
    let p2!: Promise<unknown>;
    act(() => {
      p1 = result.current.update.mutateAsync({ kinds: { EMI_OVERDUE: false } }).catch(() => undefined);
    });
    await vi.waitFor(() => expect(cached().kinds.EMI_OVERDUE).toBe(false));
    act(() => {
      p2 = result.current.update.mutateAsync({ kinds: { EMI_OVERDUE: true } }).catch(() => undefined);
    });
    await act(async () => {
      first.reject(new Error('boom'));
      await p1;
    });
    await act(async () => {
      second.reject(new Error('boom'));
      await p2;
    });
    expect(cached().kinds.EMI_OVERDUE).toBe(true);
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});
