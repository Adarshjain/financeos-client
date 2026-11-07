import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';

import { LendingShell } from './LendingShell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/lending',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
vi.mock('@/features/lendings/form/AddLendingDialog', () => ({ AddLendingDialog: () => <p>lending dialog</p> }));

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AddLendingProvider>
        <LendingShell>
          <p>page body</p>
        </LendingShell>
      </AddLendingProvider>
    </QueryClientProvider>,
  );
}

describe('LendingShell', () => {
  it('titles the bar "Lending" under the Wealth crumb, with no tab strip', () => {
    renderShell();
    expect(screen.getAllByText('Lending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Wealth').length).toBeGreaterThan(0);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('its + opens Add lending in place', async () => {
    renderShell();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add lending' })[0]);
    expect(await screen.findByText('lending dialog')).toBeInTheDocument();
  });
});
