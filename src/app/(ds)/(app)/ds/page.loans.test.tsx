import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import DsIndexPage from './page';

vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

describe('DsIndexPage Loans & lendings links', () => {
  it('links both tabs', () => {
    render(<DsIndexPage />);
    expect(screen.getByText('/loans/lendings')).toBeDefined();
    expect(screen.getByText('/loans')).toBeDefined();
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/loans/lendings');
    expect(hrefs).toContain('/loans');
  });
});

describe('DsIndexPage Transactions link', () => {
  it('links /transactions', () => {
    render(<DsIndexPage />);
    expect(screen.getByText('/transactions')).toBeDefined();
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/transactions');
  });
});

describe('DsIndexPage Investments links', () => {
  it('links Holdings and the holding page, and no longer lists them as still to build', () => {
    render(<DsIndexPage />);
    expect(screen.getByText('Holdings')).toBeDefined();
    expect(screen.getByText('Holding detail')).toBeDefined();
    expect(screen.getByText('/investments')).toBeDefined();
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs.filter((h) => h === '/investments')).toHaveLength(2);
  });
});
