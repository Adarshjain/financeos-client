import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';

import { LoansLendingsShell } from './LoansLendingsShell';

let pathname = '/ds/loans/lendings';
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
vi.mock('@/features/lendings/form/AddLendingDialog', () => ({ AddLendingDialog: () => <p>lending dialog</p> }));
vi.mock('./form/LoanFormDialog', () => ({
  LoanFormDialog: ({ onClose }: { onClose: () => void }) => (
    <div>
      <p>loan dialog</p>
      <button onClick={onClose}>close loan</button>
    </div>
  ),
}));

const loadTabCounts = vi.fn();
vi.mock('./tabCountsActions', () => ({ loadTabCounts: () => loadTabCounts() }));

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AddLendingProvider>
        <LoansLendingsShell>
          <p>tab body</p>
        </LoansLendingsShell>
      </AddLendingProvider>
    </QueryClientProvider>,
  );
}

const add = () => screen.getAllByRole('button', { name: 'Add' })[0];

beforeEach(() => {
  pathname = '/ds/loans/lendings';
  loadTabCounts.mockReset();
  loadTabCounts.mockResolvedValue({ success: true, data: { lendings: 4, loans: 3 } });
});

describe('LoansLendingsShell', () => {
  it('shows Lendings then Loans as route tabs, with the counts once they load', async () => {
    renderShell();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Lendings', 'Loans']);
    expect(tabs[0]).toHaveAttribute('href', '/ds/loans/lendings');
    expect(tabs[1]).toHaveAttribute('href', '/ds/loans');
    expect(screen.getByText('tab body')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Lendings · 4', 'Loans · 3']));
  });

  it('keeps the tabs without counts when the counts fail', async () => {
    loadTabCounts.mockResolvedValue({ success: false, error: { message: 'down' } });
    renderShell();
    await waitFor(() => expect(loadTabCounts).toHaveBeenCalled());
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Lendings', 'Loans']);
  });

  it('marks the tab of the current route', () => {
    renderShell();
    expect(screen.getByRole('tab', { name: /Lendings/ })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('tab', { name: /Loans/ })).toHaveAttribute('data-state', 'inactive');
  });

  it('titles the bar "Lendings" on that tab and its + opens Add lending', () => {
    renderShell();
    expect(screen.getAllByText('Lendings').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Owe & lend').length).toBeGreaterThan(0);
    fireEvent.click(add());
    expect(screen.getByText('lending dialog')).toBeInTheDocument();
    expect(screen.queryByText('loan dialog')).toBeNull();
  });

  it('titles the bar "Loans & lendings" on the Loans tab and its + opens Add loan', () => {
    pathname = '/ds/loans';
    renderShell();
    expect(screen.getAllByText('Loans & lendings').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: /Loans/ })).toHaveAttribute('data-state', 'active');
    fireEvent.click(add());
    expect(screen.getByText('loan dialog')).toBeInTheDocument();
    expect(screen.queryByText('lending dialog')).toBeNull();
    fireEvent.click(screen.getByText('close loan'));
    expect(screen.queryByText('loan dialog')).toBeNull();
  });
});
