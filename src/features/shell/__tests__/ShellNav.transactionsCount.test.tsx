import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ShellRail, ShellTabBar } from '../ShellNav';

vi.mock('next/navigation', () => ({ usePathname: () => '/ds/transactions', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
let review = 25;
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: review }) }));
vi.mock('@/features/lendings/form/AddLendingProvider', () => ({ useAddLending: () => ({ open: vi.fn() }) }));

const user = { email: 'a@b.c' };

describe('Transactions nav count', () => {
  it('shows the needs-review count on the rail and the tab bar', () => {
    render(<ShellRail user={user} />);
    expect(screen.getByRole('link', { name: /Transactions/ })).toHaveTextContent('25');
    render(<ShellTabBar user={user} />);
    expect(screen.getByRole('tab', { name: /Transactions/ })).toHaveTextContent('25');
  });

  it('shows none when nothing needs review', () => {
    review = 0;
    render(<ShellRail user={user} />);
    expect(screen.getByRole('link', { name: /Transactions/ })).toHaveTextContent(/^Transactions$/);
  });
});
