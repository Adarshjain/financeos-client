import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));
const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
let search = '';
vi.mock('next/navigation', () => ({
  unstable_rethrow: () => undefined,
  useRouter: () => ({ push, replace, refresh }),
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/notifications',
}));

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { NotificationsScreen } from './NotificationsScreen';
import { feedPage, notif, serve } from './notificationsTestUtils';

const mockApi = api as unknown as { GET: ReturnType<typeof vi.fn>; POST: ReturnType<typeof vi.fn> };
const NEWEST = '2026-10-21T08:35:00.987654Z';

const today1 = notif({ id: 'a', title: 'Import failed', body: 'Amex PDF', read: false, createdAt: NEWEST, kind: 'job_failed' });
const today2 = notif({ id: 'b', title: 'Sync done', body: 'Gmail', read: true, createdAt: '2026-10-21T02:00:00Z', kind: 'statement_imported', refs: {} as never });
const yest = notif({ id: 'c', title: 'Cap reached', body: 'Dining', read: true, createdAt: '2026-10-20T10:00:00Z', kind: 'reward_cap', refs: { accountId: 'acc1' } as never });
const old = notif({ id: 'd', title: 'Imported', body: 'HDFC', read: true, createdAt: '2026-10-13T10:00:00Z', kind: 'statement_imported', refs: {} as never });

describe('NotificationsScreen', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    search = '';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T06:00:00Z'));
    mockApi.POST.mockResolvedValue({ data: { cleared: 3 } });
  });
  afterEach(() => vi.useRealTimers());

  it('groups rows by day, with the time on the row and the body as subtitle', async () => {
    serve(mockApi, feedPage([today1, today2, yest, old]), 1);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Import failed');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Today', 'Yesterday', '13 Oct']);
    expect(screen.getByText('Amex PDF')).toBeInTheDocument();
    expect(screen.getByText('2:05 pm')).toBeInTheDocument();
    expect(mockApi.GET).toHaveBeenCalledWith('/api/v1/notifications/feed', { params: { query: { page: 0, size: 20 } } });
  });

  it('rows with a destination open it; rows without are not clickable', async () => {
    serve(mockApi, feedPage([today1, today2]), 0);
    renderWithQuery(<NotificationsScreen />);
    const rows = await screen.findAllByTestId('notification-row');
    fireEvent.click(rows[0]);
    expect(push).toHaveBeenCalledWith('/settings/activity?job=j1');
    push.mockClear();
    fireEvent.click(rows[1]);
    expect(push).not.toHaveBeenCalled();
  });

  it('highlights rows unread on load and marks read with the newest createdAt as sent', async () => {
    serve(mockApi, feedPage([today1, today2]), 1);
    renderWithQuery(<NotificationsScreen />);
    const rows = await screen.findAllByTestId('notification-row');
    await waitFor(() =>
      expect(mockApi.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/read', { body: { before: NEWEST } }),
    );
    expect(rows[0].className).toContain('bg-brand-tint');
    expect(rows[1].className).not.toContain('bg-brand-tint');
  });

  it('marks nothing read when everything on the page is already read', async () => {
    serve(mockApi, feedPage([today2]), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    expect(mockApi.POST).not.toHaveBeenCalled();
  });

  it('Clear removes the row at once, toasts with Undo, and Undo restores it', async () => {
    serve(mockApi, feedPage([today2, yest]), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    serve(mockApi, feedPage([yest]), 0); // the server's answer once it is gone
    fireEvent.click(within(screen.getAllByTestId('notification-row')[0]).getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(screen.queryByText('Sync done')).not.toBeInTheDocument());
    expect(mockApi.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/{id}/clear', { params: { path: { id: 'b' } } });
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Notification cleared', expect.anything()));
    const { action } = showToast.mock.calls[0][1];
    expect(action.label).toBe('Undo');
    await act(async () => action.onSelect());
    expect(mockApi.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/{id}/restore', { params: { path: { id: 'b' } } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Restored'));
  });

  it('a failed clear puts the row back with the copy', async () => {
    serve(mockApi, feedPage([today2, yest]), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    mockApi.POST.mockRejectedValue(new Error('nope'));
    fireEvent.click(within(screen.getAllByTestId('notification-row')[0]).getByRole('button', { name: 'Clear' }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Couldn't clear. The notification is back.", { tone: 'danger' }),
    );
    expect(await screen.findByText('Sync done')).toBeInTheDocument();
  });

  it('Clear all confirms first, then clears and toasts', async () => {
    serve(mockApi, feedPage([today2, yest]), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(await screen.findByText('Clear all notifications?')).toBeInTheDocument();
    expect(screen.getByText('This removes all 2 notifications. New ones still show up here.')).toBeInTheDocument();
    expect(mockApi.POST).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    serve(mockApi, feedPage([]), 0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(mockApi.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/clear'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Notifications cleared'));
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
  });

  it('Cancel leaves everything in place; a failed Clear all toasts and keeps the dialog', async () => {
    serve(mockApi, feedPage([today2]), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockApi.POST).not.toHaveBeenCalled();

    mockApi.POST.mockRejectedValue(new Error('nope'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Couldn't clear notifications. Try again.", { tone: 'danger' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Clear all with a single notification says so', async () => {
    serve(mockApi, feedPage([today2]), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(await screen.findByText('This removes 1 notification. New ones still show up here.')).toBeInTheDocument();
  });

  it('clearing the last row of a later page steps back once the server agrees', async () => {
    search = 'page=2';
    serve(mockApi, feedPage([today2], { totalElements: 21, totalPages: 2 }), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    serve(mockApi, feedPage([], { totalElements: 20, totalPages: 1 }), 0);
    fireEvent.click(within(screen.getAllByTestId('notification-row')[0]).getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/notifications', { scroll: false }));
  });

  it('a failed clear of the last row of a later page stays on that page', async () => {
    search = 'page=2';
    serve(mockApi, feedPage([today2], { totalElements: 21, totalPages: 2 }), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    mockApi.POST.mockRejectedValue(new Error('nope'));
    fireEvent.click(within(screen.getAllByTestId('notification-row')[0]).getByRole('button', { name: 'Clear' }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Couldn't clear. The notification is back.", { tone: 'danger' }),
    );
    expect(await screen.findByText('Sync done')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('pager above and below when there are several pages; the page goes in the URL and 0 is omitted', async () => {
    search = 'page=2';
    serve(mockApi, feedPage([today2], { totalElements: 45, totalPages: 3 }), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    expect(mockApi.GET).toHaveBeenCalledWith('/api/v1/notifications/feed', { params: { query: { page: 1, size: 20 } } });
    expect(screen.getAllByRole('button', { name: 'Next page' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Previous page' })[0]);
    expect(push).toHaveBeenCalledWith('/notifications', { scroll: false });
    push.mockClear();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Next page' }))[1]);
    expect(push).toHaveBeenCalledWith('/notifications?page=2', { scroll: false });
  });

  it('no pager for a single page', async () => {
    serve(mockApi, feedPage([today2]), 0);
    renderWithQuery(<NotificationsScreen />);
    await screen.findByText('Sync done');
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('empty state', async () => {
    serve(mockApi, feedPage([]), 0);
    renderWithQuery(<NotificationsScreen />);
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
    expect(screen.getByText('Finished imports, syncs and rewards show up here.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('error with Try again that reloads', async () => {
    mockApi.GET.mockImplementation(async (path: string) => {
      if (path.endsWith('/summary')) return { data: { unread: 0 } };
      throw new Error('boom');
    });
    renderWithQuery(<NotificationsScreen />);
    expect(await screen.findByText("Couldn't load notifications")).toBeInTheDocument();
    serve(mockApi, feedPage([today2]), 0);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Sync done')).toBeInTheDocument();
  });

  it('skeleton while loading', () => {
    mockApi.GET.mockReturnValue(new Promise(() => undefined));
    renderWithQuery(<NotificationsScreen />);
    expect(screen.getByTestId('notifications-skeleton')).toBeInTheDocument();
  });
});
