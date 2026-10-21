import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';

import { LoansLendingsShell } from './LoansLendingsShell';

let pathname = '/ds/loans/l1';
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
vi.mock('@/features/lendings/form/AddLendingDialog', () => ({ AddLendingDialog: () => null }));

const loadTabCounts = vi.fn();
vi.mock('./tabCountsActions', () => ({ loadTabCounts: () => loadTabCounts() }));

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AddLendingProvider>
        <LoansLendingsShell>
          <p>loan page</p>
        </LoansLendingsShell>
      </AddLendingProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  pathname = '/ds/loans/l1';
  loadTabCounts.mockReset();
  loadTabCounts.mockResolvedValue({ success: true, data: { lendings: 4, loans: 3 } });
});

describe('LoansLendingsShell on a loan page', () => {
  it('shows the page alone: no tabs, no top bar of its own, no counts requested', () => {
    renderShell();
    expect(screen.getByText('loan page')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByRole('banner')).toBeNull();
    expect(loadTabCounts).not.toHaveBeenCalled();
  });

  it('still frames the two tabs', () => {
    pathname = '/ds/loans';
    renderShell();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Lendings', 'Loans']);
  });

  it("shows a person's page alone too: no tabs, no counts requested", () => {
    pathname = '/ds/loans/lendings/p1';
    renderShell();
    expect(screen.getByText('loan page')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(loadTabCounts).not.toHaveBeenCalled();
  });

  it('still frames the Lendings tab', () => {
    pathname = '/ds/loans/lendings';
    renderShell();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Lendings', 'Loans']);
  });
});
