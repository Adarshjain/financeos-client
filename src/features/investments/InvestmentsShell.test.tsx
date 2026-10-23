import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InvestmentsShell } from './InvestmentsShell';

let pathname = '/ds/investments';
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

const loadTabCounts = vi.fn();
vi.mock('./tabCountsActions', () => ({ loadTabCounts: () => loadTabCounts() }));

const tabTexts = () => screen.getAllByRole('tab').map((t) => t.textContent);

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InvestmentsShell>
        <p>tab body</p>
      </InvestmentsShell>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  pathname = '/ds/investments';
  loadTabCounts.mockReset();
  loadTabCounts.mockResolvedValue({
    success: true,
    data: { tradebook: 38, dividends: 5, fno: 5, 'corporate-actions': 2 },
  });
});

describe('InvestmentsShell', () => {
  it('shows the six tabs with Holdings active and the page below them', () => {
    renderShell();
    expect(tabTexts()).toEqual([
      'Holdings',
      'Tradebook',
      'Dividends',
      'F&O',
      'Corporate actions',
      'Instruments',
    ]);
    expect(screen.getByRole('tab', { name: 'Holdings' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('tab body')).toBeInTheDocument();
  });

  it('puts the counts on Tradebook, Dividends, F&O and Corporate actions once they load, and none on Holdings or Instruments', async () => {
    renderShell();
    await waitFor(() => expect(tabTexts()).toContain('Tradebook · 38'));
    expect(tabTexts()).toEqual(['Holdings', 'Tradebook · 38', 'Dividends · 5', 'F&O · 5', 'Corporate actions · 2', 'Instruments']);
  });

  it('links Holdings to Dinero and the other tabs to their Legacy pages', () => {
    renderShell();
    const href = (label: RegExp) => screen.getByRole('tab', { name: label }).getAttribute('href');
    expect(href(/^Holdings/)).toBe('/ds/investments');
    expect(href(/^Tradebook/)).toBe('/investments/tradebook');
    expect(href(/^Corporate actions/)).toBe('/investments/corporate-actions');
    expect(href(/^Instruments/)).toBe('/investments/instruments');
  });

  it('keeps the tabs without counts when the counts fail', async () => {
    loadTabCounts.mockResolvedValue({ success: false, error: { message: 'down' } });
    renderShell();
    await waitFor(() => expect(loadTabCounts).toHaveBeenCalled());
    expect(screen.getByRole('tab', { name: 'Tradebook' })).toBeInTheDocument();
  });

  it('has the title Investments with its crumb, and no Add button', () => {
    renderShell();
    expect(screen.getAllByText('Investments').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Grow').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
  });

  it("renders a holding's own page without the tab strip", () => {
    pathname = '/ds/investments/i1';
    renderShell();
    expect(screen.getByText('tab body')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(loadTabCounts).not.toHaveBeenCalled();
  });
});
