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
    expect(screen.getByText('/ds/loans/lendings')).toBeDefined();
    expect(screen.getByText('/ds/loans')).toBeDefined();
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/ds/loans/lendings');
    expect(hrefs).toContain('/ds/loans');
  });
});
