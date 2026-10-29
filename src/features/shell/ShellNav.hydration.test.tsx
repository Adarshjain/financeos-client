import { render, screen } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ShellRail, ShellTabBar } from './ShellNav';

vi.mock('next/navigation', () => ({ usePathname: () => '/transactions', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 3 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 25 }) }));
vi.mock('@/features/lendings/form/AddLendingProvider', () => ({ useAddLending: () => ({ open: vi.fn() }) }));

const user = { email: 'a@b.c' };

describe('nav counts and hydration', () => {
  it('the server render draws no count on the rail or the tab bar, whatever the cache holds', () => {
    const html = renderToString(
      <>
        <ShellRail user={user} />
        <ShellTabBar user={user} />
      </>,
    );
    expect(html).not.toContain('>25<');
    expect(html).not.toContain('>3<');
  });

  it('the counts show once mounted', () => {
    render(<ShellTabBar user={user} />);
    expect(screen.getByRole('tab', { name: /Transactions/ })).toHaveTextContent('25');
  });
});
