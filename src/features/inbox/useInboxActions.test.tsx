import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

import { api } from '@/lib/api/client';

import { type InboxNotifier, useInboxActions } from './useInboxActions';

const notifier: InboxNotifier = {
  snoozed: vi.fn(),
  dismissed: vi.fn(),
  restored: vi.fn(),
  snoozeFailed: vi.fn(),
  dismissFailed: vi.fn(),
  undoFailed: vi.fn(),
};

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useInboxActions(notifier), { wrapper });
}

describe('useInboxActions router refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
  });

  it('refreshes the router once after a snooze', async () => {
    const { result } = setup();
    act(() => result.current.snooze('bill:1', '2026-11-01'));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
  });

  it('refreshes the router once after a dismiss', async () => {
    const { result } = setup();
    act(() => result.current.dismiss('bill:1'));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
  });

  it('refreshes the router again when the toast Undo runs', async () => {
    const { result } = setup();
    act(() => result.current.dismiss('bill:1'));
    await waitFor(() => expect(notifier.dismissed).toHaveBeenCalled());
    const undo = vi.mocked(notifier.dismissed).mock.calls[0][0];
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
    act(() => undo());
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(2));
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/inbox/{key}/state', { params: { path: { key: 'bill:1' } } });
  });

  it('does not refresh the router when the action fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = setup();
    act(() => result.current.dismiss('bill:1'));
    await waitFor(() => expect(notifier.dismissFailed).toHaveBeenCalled());
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it('refreshes once, after the last of two overlapping actions settles', async () => {
    const resolvers: Array<() => void> = [];
    vi.mocked(api.POST).mockImplementation(
      () => new Promise((resolve) => resolvers.push(() => resolve({ data: undefined } as never))) as never,
    );
    const { result } = setup();
    act(() => {
      result.current.dismiss('bill:1');
      result.current.dismiss('bill:2');
    });
    await waitFor(() => expect(resolvers).toHaveLength(2));
    await act(async () => resolvers[0]());
    await waitFor(() => expect(notifier.dismissed).toHaveBeenCalledTimes(1));
    expect(routerRefresh).not.toHaveBeenCalled();
    await act(async () => resolvers[1]());
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
  });
});
