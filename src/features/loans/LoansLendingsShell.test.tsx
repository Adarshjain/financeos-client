import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';

import { LoansLendingsShell } from './LoansLendingsShell';

let pathname = '/loans/lendings';
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

const add = (name: string) => screen.getAllByRole('button', { name })[0];

beforeEach(() => {
  pathname = '/loans/lendings';
});

describe('LoansLendingsShell', () => {
  it('shows Lendings then Loans as route tabs, with no counts', () => {
    renderShell();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Lendings', 'Loans']);
    expect(tabs[0]).toHaveAttribute('href', '/loans/lendings');
    expect(tabs[1]).toHaveAttribute('href', '/loans');
    expect(screen.getByText('tab body')).toBeInTheDocument();
  });

  it('marks the tab of the current route', () => {
    renderShell();
    expect(screen.getByRole('tab', { name: /Lendings/ })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('tab', { name: /Loans/ })).toHaveAttribute('data-state', 'inactive');
  });

  it('titles the bar "Loans & lendings" on the Lendings tab too and its + opens Add lending', async () => {
    renderShell();
    expect(screen.getAllByText('Loans & lendings').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Owe & lend').length).toBeGreaterThan(0);
    fireEvent.click(add('Add lending'));
    expect(await screen.findByText('lending dialog')).toBeInTheDocument();
    expect(screen.queryByText('loan dialog')).toBeNull();
  });

  it('titles the bar "Loans & lendings" on the Loans tab and its + opens Add loan', async () => {
    pathname = '/loans';
    renderShell();
    expect(screen.getAllByText('Loans & lendings').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: /Loans/ })).toHaveAttribute('data-state', 'active');
    fireEvent.click(add('Add loan'));
    expect(await screen.findByText('loan dialog')).toBeInTheDocument();
    expect(screen.queryByText('lending dialog')).toBeNull();
    fireEvent.click(screen.getByText('close loan'));
    expect(screen.queryByText('loan dialog')).toBeNull();
  });
});
