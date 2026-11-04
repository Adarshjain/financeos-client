import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));

import { serverApi as api } from '@/lib/api/server';
import { keys } from '@/lib/query/keys';

import { type InboxNotifier, useInboxMutations } from './useInboxMutations';

const notifier: InboxNotifier = {
  snoozed: vi.fn(),
  dismissed: vi.fn(),
  restored: vi.fn(),
  snoozeFailed: vi.fn(),
  dismissFailed: vi.fn(),
  undoFailed: vi.fn(),
};

const invalidate = vi.hoisted(() => ({ spy: undefined as undefined | ReturnType<typeof vi.fn> }));

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  invalidate.spy = vi.spyOn(qc, 'invalidateQueries') as unknown as ReturnType<typeof vi.fn>;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useInboxMutations(notifier), { wrapper });
}

const inboxInvalidations = () =>
  invalidate.spy!.mock.calls.filter(([f]) => JSON.stringify((f as { queryKey: unknown }).queryKey) === JSON.stringify(keys.inbox.all)).length;

describe('useInboxMutations refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
  });

  it('refetches the inbox once after a snooze', async () => {
    const { result } = setup();
    act(() => result.current.snooze('bill:1', '2026-11-01'));
    await waitFor(() => expect(inboxInvalidations()).toBe(1));
  });

  it('refetches the inbox once after a dismiss', async () => {
    const { result } = setup();
    act(() => result.current.dismiss('bill:1'));
    await waitFor(() => expect(inboxInvalidations()).toBe(1));
  });

  it('refetches the inbox again when the toast Undo runs', async () => {
    const { result } = setup();
    act(() => result.current.dismiss('bill:1'));
    await waitFor(() => expect(notifier.dismissed).toHaveBeenCalled());
    const undo = vi.mocked(notifier.dismissed).mock.calls[0][0];
    await waitFor(() => expect(inboxInvalidations()).toBe(1));
    act(() => undo());
    await waitFor(() => expect(inboxInvalidations()).toBe(2));
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/inbox/{key}/state', { params: { path: { key: 'bill:1' } } });
  });

  it('refetches the inbox when the action fails too, to put the real list back', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = setup();
    act(() => result.current.dismiss('bill:1'));
    await waitFor(() => expect(notifier.dismissFailed).toHaveBeenCalled());
    await waitFor(() => expect(inboxInvalidations()).toBe(1));
  });

  it('refetches once, after the last of two overlapping actions settles', async () => {
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
    expect(inboxInvalidations()).toBe(0);
    await act(async () => resolvers[1]());
    await waitFor(() => expect(inboxInvalidations()).toBe(1));
  });
});

describe('useInboxMutations no statement this period', () => {
  const statementNotifier: InboxNotifier = { ...notifier, statementSkipped: vi.fn(), statementSkipFailed: vi.fn() };
  const setupSkip = () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    invalidate.spy = vi.spyOn(qc, 'invalidateQueries') as unknown as ReturnType<typeof vi.fn>;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return renderHook(() => useInboxMutations(statementNotifier), { wrapper });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: { id: 'K1' } } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
  });

  it('posts the skip, refetches the inbox and offers Undo, which deletes the skip', async () => {
    const { result } = setupSkip();
    act(() => result.current.noStatement('statement_expected:A1:2026-10-03', 'A1', '2026-10-03'));
    await waitFor(() => expect(statementNotifier.statementSkipped).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/accounts/{accountId}/statement-skips', {
      params: { path: { accountId: 'A1' } },
      body: { periodEnd: '2026-10-03' },
    });
    await waitFor(() => expect(inboxInvalidations()).toBe(1));
    expect(refresh).toHaveBeenCalledTimes(1);
    const undo = vi.mocked(statementNotifier.statementSkipped!).mock.calls[0][0];
    act(() => undo());
    await waitFor(() => expect(notifier.restored).toHaveBeenCalled());
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/accounts/{accountId}/statement-skips/{skipId}', {
      params: { path: { accountId: 'A1', skipId: 'K1' } },
    });
    await waitFor(() => expect(inboxInvalidations()).toBe(2));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('tells the user when the skip fails, and refetches to put the row back', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    const { result } = setupSkip();
    act(() => result.current.noStatement('statement_expected:A1:2026-10-03', 'A1', '2026-10-03'));
    await waitFor(() => expect(statementNotifier.statementSkipFailed).toHaveBeenCalled());
    await waitFor(() => expect(inboxInvalidations()).toBe(1));
  });
});
