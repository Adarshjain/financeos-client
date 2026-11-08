import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ShellRail, ShellTabBar } from './ShellNav';

vi.mock('next/navigation', () => ({ usePathname: () => '/home', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('./search/SearchProvider', () => ({ useSearch: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));
vi.mock('@/features/lendings/form/AddLendingProvider', () => ({ useAddLending: () => ({ open: vi.fn() }) }));
let total = 0;
vi.mock('@/lib/query/hooks/useDataSourceIssues', () => ({ useDataSourceIssues: () => ({ connections: total, failedJobs: 0, total }) }));

const user = { email: 'a@b.c' };

function openMenu() {
  render(<ShellTabBar user={user} />);
  fireEvent.click(screen.getByRole('tab', { name: /Menu/ }));
}

describe('Menu profile row', () => {
  it('shows the normal subtitle with no issues', () => {
    total = 0;
    openMenu();
    expect(screen.getByText('Settings · connections · notifications')).toBeInTheDocument();
  });

  it.each([[1, '1 issue'], [4, '4 issues']])('shows a warning word for %i', (n, label) => {
    total = n;
    openMenu();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText('Settings · connections · notifications')).toBeNull();
  });
});

describe('Rail Settings row', () => {
  it('shows no warning with no issues', () => {
    total = 0;
    render(<ShellRail user={user} />);
    expect(screen.queryByText(/issues?$/)).toBeNull();
  });

  it.each([[1, '1 issue'], [3, '3 issues']])('shows a warning word for %i under the Settings row', (n, label) => {
    total = n;
    render(<ShellRail user={user} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
