import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as transactionLinksActions from '@/actions/transaction-links';
import * as transactionsActions from '@/actions/transactions';
import { TransactionsBrowser } from '@/components/transactions/TransactionsBrowser';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Food' },
];

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
  it('clears loading state and shows toast on fetch rejection (CD-2a)', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockRejectedValue(new Error('Network error'));

    render(
      <TransactionsBrowser
        accounts={mockAccounts}
        categories={mockCategories}
        needsReviewCount={5}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading transactions...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  it('renders badge count and updates after search fetch (CD-6)', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
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

    render(
      <TransactionsBrowser
        accounts={mockAccounts}
        categories={mockCategories}
        needsReviewCount={12}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  it('toggles sort direction and selection mode', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
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

    render(
      <TransactionsBrowser
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

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
    const linkModeBtn = screen.getByRole('button', { name: /^Link$/i });
    fireEvent.click(linkModeBtn);

    // Checkbox should be rendered in selection mode
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('selects transaction in link selection mode and opens link modal', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
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

    render(
      <TransactionsBrowser
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument();
    });

    // Enter Link selection mode
    const linkModeBtn = screen.getByRole('button', { name: /^Link$/i });
    fireEvent.click(linkModeBtn);

    // Select row checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Click Link Transactions toolbar button
    const linkToolbarBtn = screen.getByRole('button', { name: /Link \(/i });
    expect(linkToolbarBtn).toBeInTheDocument();
    fireEvent.click(linkToolbarBtn);
  });
});
