import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LoansShell } from './LoansShell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/loans',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
vi.mock('./form/LoanFormDialog', () => ({
  LoanFormDialog: ({ onClose }: { onClose: () => void }) => (
    <div>
      <p>loan dialog</p>
      <button onClick={onClose}>close loan</button>
    </div>
  ),
}));

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LoansShell>
        <p>page body</p>
      </LoansShell>
    </QueryClientProvider>,
  );
}

describe('LoansShell', () => {
  it('titles the bar "Loans" under the Money crumb, with no tab strip', () => {
    renderShell();
    expect(screen.getAllByText('Loans').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Money').length).toBeGreaterThan(0);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('its + opens Add loan in place and closes again', async () => {
    renderShell();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add loan' })[0]);
    expect(await screen.findByText('loan dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close loan'));
    expect(screen.queryByText('loan dialog')).toBeNull();
  });
});
