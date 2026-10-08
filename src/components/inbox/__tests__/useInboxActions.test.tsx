import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

import { api } from '@/lib/api/client';
import type { InboxResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import { useInboxActions } from '../useInboxActions';
import { item } from './fixtures';

const KEY = 'card_bill:abc-123:OVERDUE';

function listWith(): InboxResponse {
  return {
    generatedAt: '2026-10-08T00:00:00Z',
    items: [
      item({ key: KEY, section: 'act_now' }),
      item({ key: 'other', section: 'needs_look' }),
      item({ key: 'fyi', section: 'info' }),
    ],
    summary: { actNow: 1, needsLook: 1, info: 1, badge: 2 },
  };
}

function setup(seed = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  if (seed) {
    const list = listWith();
    qc.setQueryData(keys.inbox.list(), list);
    qc.setQueryData(keys.inbox.summary(), list.summary);
  }
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useInboxActions(), { wrapper: Wrapper });
  return { qc, hook };
}

describe('useInboxActions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
  });

  it('snooze passes the RAW key (not pre-encoded) and the until date', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    const { hook } = setup();
    act(() => hook.result.current.snooze(KEY, '2026-10-12'));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/snooze', {
      params: { path: { key: KEY } },
      body: { until: '2026-10-12' },
    });
  });

  it('dismiss passes the raw key', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    const { hook } = setup();
    act(() => hook.result.current.dismiss(KEY));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/dismiss', { params: { path: { key: KEY } } });
  });

  it('removes the row and recomputes the counts optimistically, before the server answers', async () => {
    let release!: () => void;
    vi.mocked(api.POST).mockReturnValue(new Promise((r) => { release = () => r({ data: undefined }); }) as never);
    const { qc, hook } = setup();
    act(() => hook.result.current.dismiss(KEY));
    await waitFor(() => {
      const list = qc.getQueryData<InboxResponse>(keys.inbox.list())!;
      expect(list.items.map((i) => i.key)).toEqual(['other', 'fyi']);
    });
    const list = qc.getQueryData<InboxResponse>(keys.inbox.list())!;
    expect(list.summary).toEqual({ actNow: 0, needsLook: 1, info: 1, badge: 1 });
    expect(qc.getQueryData(keys.inbox.summary())).toEqual({ actNow: 0, needsLook: 1, info: 1, badge: 1 });
    release();
  });

  it('snooze success toasts with the formatted date and an Undo action', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    const { hook } = setup();
    act(() => hook.result.current.snooze(KEY, '2026-10-12'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    const [msg, opts] = toastMock.success.mock.calls[0];
    expect(msg).toBe('Snoozed until 12 Oct 26');
    expect(opts.action.label).toBe('Undo');
  });

  it('dismiss success toasts "Dismissed" with Undo', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    const { hook } = setup();
    act(() => hook.result.current.dismiss(KEY));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    expect(toastMock.success.mock.calls[0][0]).toBe('Dismissed');
    expect(toastMock.success.mock.calls[0][1].action.label).toBe('Undo');
  });

  it('Undo calls DELETE /inbox/{key}/state with the raw key, toasts Restored and invalidates', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
    const { qc, hook } = setup();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    act(() => hook.result.current.dismiss(KEY));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    spy.mockClear();
    act(() => toastMock.success.mock.calls[0][1].action.onClick());
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/inbox/{key}/state', { params: { path: { key: KEY } } }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Restored'));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: keys.inbox.all }));
  });

  it('a failed undo toasts an error', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.DELETE).mockRejectedValue(new Error('x'));
    const { hook } = setup();
    act(() => hook.result.current.snooze(KEY, '2026-10-12'));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    act(() => toastMock.success.mock.calls[0][1].action.onClick());
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
  });

  it('a failed snooze restores the list and summary and toasts', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('server said no'));
    const { qc, hook } = setup();
    act(() => hook.result.current.snooze(KEY, '2026-10-12'));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(toastMock.success).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(qc.getQueryData<InboxResponse>(keys.inbox.list())!.items).toHaveLength(3);
    });
    expect(qc.getQueryData(keys.inbox.summary())).toEqual({ actNow: 1, needsLook: 1, info: 1, badge: 2 });
  });

  it('a failed dismiss restores the list and toasts', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('nope'));
    const { qc, hook } = setup();
    act(() => hook.result.current.dismiss(KEY));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    await waitFor(() => expect(qc.getQueryData<InboxResponse>(keys.inbox.list())!.items).toHaveLength(3));
  });

  it('invalidates the inbox after settling, success or not', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    const { qc, hook } = setup();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    act(() => hook.result.current.dismiss(KEY));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: keys.inbox.all }));
  });

  it('works with nothing cached (no list to hide the row from)', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    const { qc, hook } = setup(false);
    act(() => hook.result.current.dismiss(KEY));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Dismissed', expect.anything()));
    expect(qc.getQueryData(keys.inbox.list())).toBeUndefined();
  });
});
