import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InboxShell } from './InboxShell';

let pathname = '/inbox';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

beforeEach(() => {
  pathname = '/inbox';
});

describe('InboxShell', () => {
  it('shows To do and Updates as route tabs under the Inbox title', () => {
    render(
      <InboxShell>
        <p>tab body</p>
      </InboxShell>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['To do', 'Updates']);
    expect(tabs[0]).toHaveAttribute('href', '/inbox');
    expect(tabs[1]).toHaveAttribute('href', '/inbox/updates');
    expect(tabs[0]).toHaveAttribute('data-state', 'active');
    expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0);
    expect(screen.getByText('tab body')).toBeInTheDocument();
  });

  it('marks Updates and keeps the Inbox title on /inbox/updates; Upcoming is no tab', () => {
    pathname = '/inbox/updates';
    render(
      <InboxShell>
        <p>tab body</p>
      </InboxShell>,
    );
    expect(screen.getByRole('tab', { name: 'Updates' })).toHaveAttribute('data-state', 'active');
    expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0);
    expect(screen.queryByRole('tab', { name: /Upcoming|Calendar/ })).toBeNull();
  });
});
