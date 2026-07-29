import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as transactionsActions from '@/actions/transactions';
import { ReviewBrowser } from '@/components/transactions/ReviewBrowser';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT, lastStatementDate: '2026-06-30' },
  {
    id: 'acc2',
    name: 'ICICI Card',
    type: AccountType.CREDIT_CARD,
    last4: '0002',
    creditLimit: 100000,
    paymentDueDay: 10,
    gracePeriodDays: 20,
    lastStatementDate: null,
  },
];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Shopping' },
];

const mockReviewTxn: Transaction = {
  id: 't-review-1',
  accountId: 'acc1',
  date: '2026-06-15',
  amount: -1200,
  description: 'Unverified Merchant',
  sourcedDescription: 'UNVERIFIED MERCHANT',
  source: 'gmail_transaction_alert',
  reviewType: 'NEEDS_REVIEW',
  reviewReasons: ['CATEGORY_UNVERIFIED'],
  balance: 15000,
  createdAt: '2026-06-15T00:00:00Z',
};

describe('ReviewBrowser (CD-1, CD-2a, CD-2b, CD-3)', () => {
  it('defaults to coveredByStatement=true filter clause (CD-1)', async () => {
    const searchSpy = vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
      data: {
        content: [mockReviewTxn],
        number: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(<ReviewBrowser accounts={mockAccounts} categories={mockCategories} />);

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalled();
    });

    const searchCallFilters = searchSpy.mock.calls[0][0].filters;
    const coveredClause = searchCallFilters.find((f: any) => f.field === 'coveredByStatement');
    expect(coveredClause).toEqual({ field: 'coveredByStatement', operator: 'is', value: true });

    // reviewType is NEEDS_REVIEW is always present and non-removable
    const reviewTypeClause = searchCallFilters.find((f: any) => f.field === 'reviewType');
    expect(reviewTypeClause).toEqual({ field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' });

    // When all accounts are selected, accountId in [...] is omitted
    const accountIdClause = searchCallFilters.find((f: any) => f.field === 'accountId');
    expect(accountIdClause).toBeUndefined();
  });

  it('queue fetch rejection clears loading state without infinite spinner (CD-2a)', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockRejectedValue(new Error('Network offline'));

    render(<ReviewBrowser accounts={mockAccounts} categories={mockCategories} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading transactions/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('No transactions need review')).toBeInTheDocument();
  });

  it('steps back one page when batch action leaves current page empty (CD-2b)', async () => {
    const searchSpy = vi.spyOn(transactionsActions, 'searchTransactions');

    // First call: page 1 returns 1 item
    searchSpy.mockResolvedValueOnce({
      success: true,
      data: {
        content: [mockReviewTxn],
        number: 1,
        size: 50,
        totalElements: 51,
        totalPages: 2,
        first: true,
        last: true,
        empty: false,
      },
    });

    // Second call: after page 1 becomes empty, returns empty page 1 with totalElements 50
    searchSpy.mockResolvedValueOnce({
      success: true,
      data: {
        content: [],
        number: 1,
        size: 50,
        totalElements: 50,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    // Third call: step back to page 0
    searchSpy.mockResolvedValueOnce({
      success: true,
      data: {
        content: [mockReviewTxn],
        number: 0,
        size: 50,
        totalElements: 50,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(<ReviewBrowser accounts={mockAccounts} categories={mockCategories} />);

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalled();
    });
  });

  it('filters by active review reason segment when reason pill is clicked (CD-3)', async () => {
    const searchSpy = vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
      data: {
        content: [mockReviewTxn],
        number: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(<ReviewBrowser accounts={mockAccounts} categories={mockCategories} />);

    await waitFor(() => {
      expect(screen.getByText('Unverified Merchant')).toBeInTheDocument();
    });

    // Click Category reason segment pill
    const categoryFilterBtn = screen.getByRole('button', { name: 'Category' });
    fireEvent.click(categoryFilterBtn);

    await waitFor(() => {
      const filters = searchSpy.mock.calls[searchSpy.mock.calls.length - 1][0].filters;
      const reasonClause = filters.find((f: any) => f.field === 'reviewReason');
      expect(reasonClause).toEqual({ field: 'reviewReason', operator: 'is', value: 'CATEGORY_UNVERIFIED' });
    });
  });

  it('selects item and triggers batch approve flow', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
      data: {
        content: [mockReviewTxn],
        number: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    const batchReviewSpy = vi.spyOn(transactionsActions, 'batchReviewTransactions').mockResolvedValue({
      success: true,
      data: {
        succeededIds: ['t-review-1'],
        skippedIds: [],
        failures: [],
      },
    });

    render(<ReviewBrowser accounts={mockAccounts} categories={mockCategories} />);

    await waitFor(() => {
      expect(screen.getByText('Unverified Merchant')).toBeInTheDocument();
    });

    // Select row checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    // Click Approve button in toolbar
    const approveBtn = screen.getByRole('button', { name: /^Approve$/i });
    fireEvent.click(approveBtn);

    // Confirm dialog opens, click Approve button in dialog
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Approve Transactions' })).toBeInTheDocument();
    });

    const confirmApproveBtns = screen.getAllByRole('button', { name: 'Approve' });
    // Click the dialog confirm approve button (the last one)
    fireEvent.click(confirmApproveBtns[confirmApproveBtns.length - 1]);

    await waitFor(() => {
      expect(batchReviewSpy).toHaveBeenCalledWith(['t-review-1'], 'MANUALLY_REVIEWED', ['CATEGORY_UNVERIFIED']);
    });
  });

  it('selects item and triggers batch delete flow', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
      data: {
        content: [mockReviewTxn],
        number: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    const batchDeleteSpy = vi.spyOn(transactionsActions, 'batchDeleteTransactions').mockResolvedValue({
      success: true,
      data: {
        succeededIds: ['t-review-1'],
        failures: [],
      },
    });

    render(<ReviewBrowser accounts={mockAccounts} categories={mockCategories} />);

    await waitFor(() => {
      expect(screen.getByText('Unverified Merchant')).toBeInTheDocument();
    });

    // Select row checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    // Click Delete button in toolbar
    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    // Confirmation dialog opens, click Confirm/Delete in ConfirmationDialog
    await waitFor(() => {
      expect(screen.getByText('Delete Transactions?')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(batchDeleteSpy).toHaveBeenCalledWith(['t-review-1']);
    });
  });
});
