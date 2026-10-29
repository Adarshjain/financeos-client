import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNeedsReviewCount } from '@/features/transactions/useNeedsReviewCount';
import { APP_LOCKED_EVENT } from '@/lib/appLock';
import { useInboxSummary } from '@/lib/query/hooks/useInbox';
import { useNotificationSummary } from '@/lib/query/hooks/useNotifications';
import { keys } from '@/lib/query/keys';
import { renderWithQuery } from '@/test/renderWithQuery';

const loadShellCounts = vi.hoisted(() => vi.fn());
const loadInboxSummary = vi.hoisted(() => vi.fn());
const loadNeedsReviewCount = vi.hoisted(() => vi.fn());
const loadNotificationSummary = vi.hoisted(() => vi.fn());
vi.mock('@/lib/query/actions/shellActions', () => ({ loadShellCounts }));
vi.mock('@/lib/query/actions/inboxActions', () => ({ loadInbox: vi.fn(), loadInboxSummary }));
vi.mock('@/features/transactions/list/transactionsActions', () => ({ loadNeedsReviewCount }));
vi.mock('@/lib/query/actions/notificationActions', () => ({ loadNotificationSummary }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { useShellCounts } from '../useShellCounts';

const inbox = { badge: 4 };

function Nav() {
  const { data: i } = useInboxSummary({ shell: true });
  const { data: r } = useNeedsReviewCount({ shell: true });
  return <p>{`inbox ${i?.badge ?? '-'} review ${r ?? '-'}`}</p>;
}

function Bell() {
  const { data } = useNotificationSummary({ shell: true });
  return <p>{`unread ${data?.unread ?? '-'}`}</p>;
}

function Plain() {
  useShellCounts({ enabled: false });
  return null;
}

describe('shell counts', () => {
  let qc: QueryClient;
  beforeEach(() => {
    // Nothing observes the notification key here, so entries must outlive their observers.
    qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    loadShellCounts.mockReset();
    loadInboxSummary.mockReset();
    loadNeedsReviewCount.mockReset();
    loadNotificationSummary.mockReset();
  });

  it('seeds the inbox, notification and needs-review keys from one call, with no fetch of their own', async () => {
    loadShellCounts.mockResolvedValue({ success: true, data: { inbox, needsReview: 9, notificationsUnread: 2, appLock: null } });
    renderWithQuery(<Nav />, { queryClient: qc });
    await waitFor(() => expect(screen.getByText('inbox 4 review 9')).toBeInTheDocument());
    expect(qc.getQueryData(keys.inbox.summary())).toEqual(inbox);
    expect(qc.getQueryData(keys.notifications.summary())).toEqual({ unread: 2 });
    expect(qc.getQueryData(keys.transactions.needsReviewCount())).toBe(9);
    expect(loadShellCounts).toHaveBeenCalledTimes(1);
    expect(loadInboxSummary).not.toHaveBeenCalled();
    expect(loadNeedsReviewCount).not.toHaveBeenCalled();
  });

  it('seeds nothing for a null part; that piece then loads on its own like a failed fetch would', async () => {
    loadShellCounts.mockResolvedValue({ success: true, data: { inbox: null, needsReview: 5, notificationsUnread: null, appLock: null } });
    loadInboxSummary.mockResolvedValue({ success: true, data: inbox });
    renderWithQuery(<Nav />, { queryClient: qc });
    await waitFor(() => expect(screen.getByText('inbox 4 review 5')).toBeInTheDocument());
    expect(qc.getQueryData(keys.notifications.summary())).toBeUndefined();
    expect(loadInboxSummary).toHaveBeenCalledTimes(1);
    expect(loadNeedsReviewCount).not.toHaveBeenCalled();
  });

  it('keeps an earlier value when a later call has a null part', async () => {
    qc.setQueryData(keys.notifications.summary(), { unread: 1 });
    loadShellCounts.mockResolvedValue({ success: true, data: { inbox, needsReview: 1, notificationsUnread: null, appLock: null } });
    renderWithQuery(<Nav />, { queryClient: qc });
    await waitFor(() => expect(screen.getByText('inbox 4 review 1')).toBeInTheDocument());
    expect(qc.getQueryData(keys.notifications.summary())).toEqual({ unread: 1 });
  });

  it('raises the app-lock event on a 423, as the individual calls do, and the pieces fall back to their own fetch', async () => {
    const locked = vi.fn();
    window.addEventListener(APP_LOCKED_EVENT, locked);
    loadShellCounts.mockResolvedValue({ success: false, status: 423, error: { code: 'APP_LOCKED', message: 'locked', timestamp: 'now' } });
    loadInboxSummary.mockResolvedValue({ success: false, status: 423, error: { code: 'APP_LOCKED', message: 'locked', timestamp: 'now' } });
    loadNeedsReviewCount.mockResolvedValue({ success: false, status: 423, error: { code: 'APP_LOCKED', message: 'locked', timestamp: 'now' } });
    renderWithQuery(<Nav />, { queryClient: qc });
    await waitFor(() => expect(locked).toHaveBeenCalled());
    window.removeEventListener(APP_LOCKED_EVENT, locked);
  });

  it('does not run for a hook outside the shell', () => {
    renderWithQuery(<Plain />, { queryClient: qc });
    expect(loadShellCounts).not.toHaveBeenCalled();
  });

  it('polls once a minute for the shell and leaves the individual hooks unpolled', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      loadShellCounts.mockResolvedValue({ success: true, data: { inbox, needsReview: 9, notificationsUnread: 2, appLock: null } });
      renderWithQuery(<Nav />, { queryClient: qc });
      await waitFor(() => expect(loadShellCounts).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(60_500);
      await waitFor(() => expect(loadShellCounts.mock.calls.length).toBeGreaterThanOrEqual(2));
      expect(loadInboxSummary).not.toHaveBeenCalled();
      expect(loadNeedsReviewCount).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('the bell reads its unread count from the shell call, with no fetch or poll of its own', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      loadShellCounts.mockResolvedValue({ success: true, data: { inbox, needsReview: 9, notificationsUnread: 2, appLock: null } });
      renderWithQuery(<><Nav /><Bell /></>, { queryClient: qc });
      await waitFor(() => expect(screen.getByText('unread 2')).toBeInTheDocument());
      await vi.advanceTimersByTimeAsync(60_500);
      await waitFor(() => expect(loadShellCounts.mock.calls.length).toBeGreaterThanOrEqual(2));
      expect(loadNotificationSummary).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('the bell loads its own count when the shell call leaves it empty', async () => {
    loadShellCounts.mockResolvedValue({ success: true, data: { inbox, needsReview: 9, notificationsUnread: null, appLock: null } });
    loadNotificationSummary.mockResolvedValue({ success: true, data: { unread: 3 } });
    renderWithQuery(<><Nav /><Bell /></>, { queryClient: qc });
    await waitFor(() => expect(screen.getByText('unread 3')).toBeInTheDocument());
    expect(loadNotificationSummary).toHaveBeenCalledTimes(1);
  });
});
