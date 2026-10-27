import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';

import { LoansLendingsShell } from './LoansLendingsShell';

let pathname = '/loans/l1';
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
  pathname = '/loans/l1';
});

describe('LoansLendingsShell on a loan page', () => {
  it('shows the page alone: no tabs, no top bar of its own', () => {
    renderShell();
    expect(screen.getByText('loan page')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('still frames the two tabs', () => {
    pathname = '/loans';
    renderShell();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Lendings', 'Loans']);
  });

  it("shows a person's page alone too: no tabs", () => {
    pathname = '/loans/lendings/p1';
    renderShell();
    expect(screen.getByText('loan page')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('still frames the Lendings tab', () => {
    pathname = '/loans/lendings';
    renderShell();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Lendings', 'Loans']);
  });
});
