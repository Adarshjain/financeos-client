import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The hooks read through server actions, which call the server API client.
vi.mock('@/lib/api/server', () => ({
  serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

import { serverApi as api } from '@/lib/api/server';
import { keys } from '@/lib/query/keys';

import { useNotificationFeed, useNotificationMutations, useNotificationSummary } from '../useNotifications';

const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

describe('useNotificationFeed', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches the page under its own key', async () => {
    const page = { content: [], totalElements: 0, totalPages: 0 };
    vi.mocked(api.GET).mockResolvedValue({ data: page } as never);
    const { qc, Wrapper } = setup();
    const { result } = renderHook(() => useNotificationFeed(2, 20), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(page));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/notifications/feed', { params: { query: { page: 2, size: 20 } } });
    expect(qc.getQueryData(keys.notifications.feed(2, 20))).toEqual(page);
  });
});

describe('useNotificationSummary', () => {
  beforeEach(() => vi.resetAllMocks());

  it('polls every minute with a 30s stale time and refetches on focus', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { unread: 3 } } as never);
    const { qc, Wrapper } = setup();
    const { result } = renderHook(() => useNotificationSummary(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ unread: 3 }));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/notifications/feed/summary');
    const opts = qc.getQueryCache().find({ queryKey: keys.notifications.summary() })?.observers[0].options;
    expect(opts?.refetchInterval).toBe(60_000);
    expect(opts?.staleTime).toBe(30_000);
    expect(opts?.refetchOnWindowFocus).toBe(true);
  });
});

describe('useNotificationMutations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: { cleared: 4 } } as never);
  });

  function run(call: (m: ReturnType<typeof useNotificationMutations>) => Promise<unknown> | void) {
    const { qc, Wrapper } = setup();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useNotificationMutations(), { wrapper: Wrapper });
    return { result, spy, go: () => act(async () => void (await call(result.current))) };
  }

  it('markRead posts before and refreshes the feed and the count', async () => {
    const { spy, go } = run((m) => m.markRead.mutateAsync('2026-10-20T10:00:00Z'));
    await go();
    expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/read', {
      body: { before: '2026-10-20T10:00:00Z' },
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.notifications.all });
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });

  it('clear and restore post to the item and refresh', async () => {
    const { spy, go } = run(async (m) => {
      await m.clear.mutateAsync('n1');
      await m.restore.mutateAsync('n1');
    });
    await go();
    expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/{id}/clear', { params: { path: { id: 'n1' } } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/{id}/restore', { params: { path: { id: 'n1' } } });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(routerRefresh).toHaveBeenCalledTimes(2);
  });

  it('clearAll posts to /feed/clear, returns the count and refreshes', async () => {
    let cleared = -1;
    const { spy, go } = run(async (m) => {
      cleared = (await m.clearAll.mutateAsync()) as number;
    });
    await go();
    expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/clear');
    expect(cleared).toBe(4);
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.notifications.all });
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the router when the write fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { go } = run((m) => m.clear.mutateAsync('n1').catch(() => undefined));
    await go();
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('refreshes once, after the last of two overlapping writes settles', async () => {
    const resolvers: Array<() => void> = [];
    vi.mocked(api.POST).mockImplementation(
      () => new Promise((resolve) => resolvers.push(() => resolve({ data: undefined } as never))) as never,
    );
    const { go } = run(async (m) => {
      const a = m.clear.mutateAsync('n1');
      const b = m.clear.mutateAsync('n2');
      await waitFor(() => expect(resolvers).toHaveLength(2));
      resolvers[0]();
      await a;
      expect(routerRefresh).not.toHaveBeenCalled();
      resolvers[1]();
      await b;
    });
    await go();
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });
});
