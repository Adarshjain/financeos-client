import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import type { InboxResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import { useInbox, useInboxSummary } from '../useInbox';

const inbox: InboxResponse = {
  generatedAt: '2026-10-08T00:00:00Z',
  items: [],
  summary: { actNow: 2, needsLook: 1, info: 0, badge: 3 },
};

function setup() {
  // gcTime Infinity: an observer-less summary entry written by useInbox must stay readable.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

describe('useInbox', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches /inbox under the list key and refreshes the summary entry from it', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: inbox } as never);
    const { qc, Wrapper } = setup();
    const { result } = renderHook(() => useInbox(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(inbox));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/inbox');
    expect(qc.getQueryData(keys.inbox.list())).toEqual(inbox);
    expect(qc.getQueryData(keys.inbox.summary())).toEqual(inbox.summary);
  });

  it('refetches on window focus', () => {
    vi.mocked(api.GET).mockResolvedValue({ data: inbox } as never);
    const { qc, Wrapper } = setup();
    renderHook(() => useInbox(), { wrapper: Wrapper });
    const q = qc.getQueryCache().find({ queryKey: keys.inbox.list() });
    expect(q?.observers[0].options.refetchOnWindowFocus).toBe(true);
  });
});

describe('useInboxSummary', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches /inbox/summary, polls every minute with a 30s stale time', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: inbox.summary } as never);
    const { qc, Wrapper } = setup();
    const { result } = renderHook(() => useInboxSummary(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(inbox.summary));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/inbox/summary');
    const opts = qc.getQueryCache().find({ queryKey: keys.inbox.summary() })?.observers[0].options;
    expect(opts?.refetchInterval).toBe(60_000);
    expect(opts?.staleTime).toBe(30_000);
  });
});
