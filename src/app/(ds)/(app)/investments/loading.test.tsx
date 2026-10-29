import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import DsInvestmentsLoading from './(tabs)/loading';
import DsHoldingLoading from './[instrumentId]/loading';

vi.mock('next/navigation', () => ({
  usePathname: () => '/investments',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

describe('Investments loading states', () => {
  it('draws the tile and table skeletons of Holdings', () => {
    const { container } = render(<DsInvestmentsLoading />);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(8);
  });

  it("draws the holding page's figures and cards", () => {
    const { container } = render(<DsHoldingLoading />);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(8);
  });
});
