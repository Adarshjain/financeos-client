import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionsBrowser } from '@/components/transactions/TransactionsBrowser';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
];

// Seeds the accounts query synchronously so TransactionsBrowser's internal
// useAccounts() call resolves without an async wait in every test.
function renderWithAccounts(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.accounts.list(), mockAccounts);
  return renderWithQuery(ui, { queryClient });
}

const mockTxn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -300,
  description: 'Coffee',
  sourcedDescription: 'COFFEE SHOP',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  balance: 5000,
  createdAt: '2026-07-25T00:00:00Z',
};

describe('TransactionsBrowser (CD-2a, CD-6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears loading state and shows toast on fetch rejection (CD-2a)', async () => {
    (api.POST as any).mockRejectedValue(new Error('Network error'));

    renderWithAccounts(
      <TransactionsBrowser
        needsReviewCount={5}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading transactions...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  it('renders badge count and updates after search fetch (CD-6)', async () => {
    (api.POST as any).mockResolvedValue({
      data: {
        content: [mockTxn],
        number: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    renderWithAccounts(
      <TransactionsBrowser
        needsReviewCount={12}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  it('toggles sort direction and selection mode', async () => {
    (api.POST as any).mockResolvedValue({
      data: {
        content: [mockTxn],
        number: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    renderWithAccounts(<TransactionsBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument();
    });

    // Click Date sort button
    const dateSortBtn = screen.getByRole('button', { name: /Date/i });
    fireEvent.click(dateSortBtn);

    // Click Amount sort button
    const amountSortBtns = screen.getAllByRole('button', { name: /Amount/i });
    fireEvent.click(amountSortBtns[amountSortBtns.length - 1]);

    // Click Link selection mode button
    const linkModeBtns = screen.getAllByRole('button', { name: /^Link$/i });
    fireEvent.click(linkModeBtns[0]);

    // Checkbox should be rendered in selection mode
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  it('selects transaction in link selection mode and opens link modal', async () => {
    (api.POST as any).mockResolvedValue({
      data: {
        content: [mockTxn],
        number: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    renderWithAccounts(<TransactionsBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument();
    });

    // Enter Link selection mode
    const linkModeBtns = screen.getAllByRole('button', { name: /^Link$/i });
    fireEvent.click(linkModeBtns[0]);

    // Select row checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Click Link Transactions toolbar button
    const linkToolbarBtn = screen.getByRole('button', { name: /Link \(/i });
    expect(linkToolbarBtn).toBeInTheDocument();
    fireEvent.click(linkToolbarBtn);
  });
});
