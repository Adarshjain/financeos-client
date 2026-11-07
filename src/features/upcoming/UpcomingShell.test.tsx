import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpcomingShell } from './UpcomingShell';

let pathname = '/upcoming';
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
  pathname = '/upcoming';
});

describe('UpcomingShell', () => {
  it('shows List and Calendar as route tabs, titled Upcoming under Money', () => {
    render(
      <UpcomingShell>
        <p>tab body</p>
      </UpcomingShell>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['List', 'Calendar']);
    expect(tabs[0]).toHaveAttribute('href', '/upcoming');
    expect(tabs[1]).toHaveAttribute('href', '/upcoming/calendar');
    expect(tabs[0]).toHaveAttribute('data-state', 'active');
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Money').length).toBeGreaterThan(0);
  });

  it('marks Calendar on /upcoming/calendar', () => {
    pathname = '/upcoming/calendar';
    render(
      <UpcomingShell>
        <p>tab body</p>
      </UpcomingShell>,
    );
    expect(screen.getByRole('tab', { name: 'Calendar' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('tab', { name: 'List' })).toHaveAttribute('data-state', 'inactive');
  });
});
