import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { serverApi as api } from '@/lib/api/server';

import { item } from './inboxTestUtils';
import { type InboxNotifier, useInboxMutations } from './useInboxMutations';

const notifier: InboxNotifier = {
  snoozed: vi.fn(),
  dismissed: vi.fn(),
  restored: vi.fn(),
  snoozeFailed: vi.fn(),
  dismissFailed: vi.fn(),
  undoFailed: vi.fn(),
  epfLinked: vi.fn(),
  epfDismissed: vi.fn(),
  epfFailed: vi.fn(),
};

const row = item({ key: 'epf_match:e1:t1', kind: 'epf_match', section: 'needs_look', refs: { epfEntryId: 'e1', transactionId: 't1' } });

const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
function setup() {
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return renderHook(() => useInboxMutations(notifier), { wrapper });
}

describe('useInboxMutations, EPF suggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.PUT).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
  });

  it('Link attaches the credit without recording TDS', async () => {
    const { result } = setup();
    act(() => result.current.epfLink(row));
    await waitFor(() => expect(notifier.epfLinked).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: 'e1' } },
      body: { transactionId: 't1', recordTds: false },
    });
  });

  it('refreshes the EPF and Inbox queries after Link and after Not this one', async () => {
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const keysOf = () => invalidate.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey));
    const { result } = setup();
    act(() => result.current.epfLink(row));
    await waitFor(() => expect(notifier.epfLinked).toHaveBeenCalled());
    expect(keysOf()).toEqual(expect.arrayContaining(['["epf"]', '["inbox"]']));
    invalidate.mockClear();
    act(() => result.current.epfDismiss(row));
    await waitFor(() => expect(notifier.epfDismissed).toHaveBeenCalled());
    expect(keysOf()).toEqual(expect.arrayContaining(['["epf"]', '["inbox"]']));
  });

  it('Link says so when the server refuses', async () => {
    vi.mocked(api.PUT).mockRejectedValue(new Error('Already linked'));
    const { result } = setup();
    act(() => result.current.epfLink(row));
    await waitFor(() => expect(notifier.epfFailed).toHaveBeenCalled());
    expect(notifier.epfLinked).not.toHaveBeenCalled();
  });

  it('Not this one dismisses the suggestion and then the inbox row', async () => {
    const { result } = setup();
    act(() => result.current.epfDismiss(row));
    await waitFor(() => expect(notifier.epfDismissed).toHaveBeenCalled());
    expect(vi.mocked(api.POST).mock.calls.map((c) => c[0])).toEqual([
      '/api/v1/epf/entries/{id}/suggestion/dismiss',
      '/api/v1/inbox/{key}/dismiss',
    ]);
    expect(vi.mocked(api.POST).mock.calls[0][1]).toEqual({ params: { path: { id: 'e1' } }, body: { transactionId: 't1' } });
    expect(vi.mocked(api.POST).mock.calls[1][1]).toEqual({ params: { path: { key: 'epf_match:e1:t1' } } });
  });

  it('Not this one leaves the row alone when the suggestion dismissal fails', async () => {
    vi.mocked(api.POST).mockRejectedValueOnce(new Error('boom'));
    const { result } = setup();
    act(() => result.current.epfDismiss(row));
    await waitFor(() => expect(notifier.epfFailed).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledTimes(1);
  });
});
