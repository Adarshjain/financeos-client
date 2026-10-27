import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { TopBar } from '@/components/ds';
import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { feedPage, notif, serve } from './notificationsTestUtils';
import { useNotificationsAction } from './useNotificationsAction';

const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

function Bar() {
  const bell = useNotificationsAction();
  return <TopBar title="Home" actions={[bell]} />;
}

const NEWEST = '2026-10-21T08:35:00.123456Z';
const unreadRow = notif({ id: 'a', title: 'Import failed', read: false, createdAt: NEWEST, kind: 'job_failed' });
const readRow = notif({ id: 'b', title: 'Sync done', read: true, createdAt: '2026-10-13T08:35:00Z', kind: 'gmail_sync' });
const noRefs = notif({ id: 'c', title: 'Cap reached', kind: 'reward_cap', refs: {} as never, createdAt: '2026-10-12T08:35:00Z' });

const mockApi = api as unknown as { GET: ReturnType<typeof vi.fn>; POST: ReturnType<typeof vi.fn> };
const bell = () => screen.getByRole('button', { name: 'Notifications' });

describe('Notifications bell', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    // Rows' times read relative to today; pin today to the fixtures' day.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));
    vi.resetAllMocks();
    mockApi.POST.mockResolvedValue({ data: undefined });
  });

  it('shows the dot only while something is unread', async () => {
    serve(mockApi, feedPage([unreadRow]), 2);
    const { unmount } = renderWithQuery(<Bar />);
    await waitFor(() => expect(within(bell()).queryByTestId('button-dot')).not.toBeNull());
    unmount();
    serve(mockApi, feedPage([readRow]), 0);
    renderWithQuery(<Bar />);
    await waitFor(() => expect(mockApi.GET).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(within(bell()).queryByTestId('button-dot')).toBeNull();
  });

  it('opening keeps the unread rows highlighted and marks read with the newest createdAt as sent', async () => {
    serve(mockApi, feedPage([unreadRow, readRow]), 1);
    renderWithQuery(<Bar />);
    await waitFor(() => expect(within(bell()).queryByTestId('button-dot')).not.toBeNull());
    fireEvent.click(bell());
    await waitFor(() =>
      expect(mockApi.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/read', { body: { before: NEWEST } }),
    );
    const rows = await screen.findAllByTestId('notification-row');
    expect(rows).toHaveLength(2);
    // The server now says everything is read; the snapshot keeps the first row highlighted.
    serve(mockApi, feedPage([{ ...unreadRow, read: true }, readRow]), 0);
    await waitFor(() => expect(rows[0].className).toContain('bg-brand-tint'));
    expect(rows[1].className).not.toContain('bg-brand-tint');
  });

  it('does not mark anything read when nothing is unread', async () => {
    serve(mockApi, feedPage([readRow]), 0);
    renderWithQuery(<Bar />);
    await waitFor(() => expect(mockApi.GET).toHaveBeenCalledWith('/api/v1/notifications/feed/summary'));
    fireEvent.click(bell());
    await screen.findByText('Sync done');
    expect(mockApi.POST).not.toHaveBeenCalled();
  });

  it('dropdown: rows with body and time or date, links per kind, no link without refs, See all', async () => {
    serve(mockApi, feedPage([unreadRow, readRow, noRefs]), 0);
    renderWithQuery(<Bar />);
    fireEvent.click(bell());
    const pop = await screen.findByText('Import failed');
    expect(screen.getByText('Notifications', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText('Body a · 2:05 pm')).toBeInTheDocument();
    expect(screen.getByText('Body b · 13 Oct')).toBeInTheDocument();
    expect(pop.closest('a')).toHaveAttribute('href', '/settings/activity?job=j1');
    expect(screen.getByText('Cap reached').closest('a')).toBeNull();
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/notifications');
    fireEvent.click(screen.getByRole('link', { name: 'See all' }));
    await waitFor(() => expect(screen.queryByText('Import failed')).not.toBeInTheDocument());
  });

  it('dropdown empty state', async () => {
    serve(mockApi, feedPage([]), 0);
    renderWithQuery(<Bar />);
    fireEvent.click(bell());
    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
  });

  it('dropdown error with Try again that reloads', async () => {
    mockApi.GET.mockImplementation(async (path: string) => {
      if (path.endsWith('/summary')) return { data: { unread: 0 } };
      throw new Error('boom');
    });
    renderWithQuery(<Bar />);
    fireEvent.click(bell());
    expect(await screen.findByText("Couldn't load notifications.")).toBeInTheDocument();
    serve(mockApi, feedPage([readRow]), 0);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Sync done')).toBeInTheDocument();
  });

  it('dropdown skeleton while loading', async () => {
    mockApi.GET.mockImplementation((path: string) =>
      path.endsWith('/summary') ? Promise.resolve({ data: { unread: 0 } }) : new Promise(() => undefined),
    );
    renderWithQuery(<Bar />);
    fireEvent.click(bell());
    expect(await screen.findByTestId('notifications-skeleton')).toBeInTheDocument();
    expect(within(screen.getByTestId('notifications-skeleton')).queryByRole('link')).toBeNull();
  });
});
