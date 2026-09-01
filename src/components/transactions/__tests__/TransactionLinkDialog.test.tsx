import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as linkActions from '@/actions/transaction-links';
import * as transactionsActions from '@/actions/transactions';
import { TransactionLinkDialog } from '@/components/transactions/TransactionLinkDialog';
import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

const mockAccounts: Account[] = [
  { id: 'acc-bank', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
  {
    id: 'acc-card',
    name: 'Amex Credit Card',
    type: AccountType.CREDIT_CARD,
    last4: '0001',
    creditLimit: 100000,
  },
];

const mockAnchorDebit: Transaction = {
  id: 't-anchor',
  accountId: 'acc-bank',
  date: '2026-07-25',
  amount: -5000,
  description: 'Original Purchase',
  sourcedDescription: 'ORIGINAL PURCHASE',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  balance: 20000,
  createdAt: '2026-07-25T00:00:00Z',
};

const mockCandidateCreditDiffAccount: Transaction = {
  id: 't-cand-1',
  accountId: 'acc-card',
  date: '2026-07-25',
  amount: 5000,
  description: 'Credit Counterpart',
  sourcedDescription: 'CREDIT COUNTERPART',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  balance: 0,
  createdAt: '2026-07-25T00:00:00Z',
};

const mockAlreadyLinkedCandidate: Transaction = {
  id: 't-linked',
  accountId: 'acc-card',
  date: '2026-07-25',
  amount: 5000,
  description: 'Already Linked Item',
  sourcedDescription: 'ALREADY LINKED ITEM',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  balance: 0,
  createdAt: '2026-07-25T00:00:00Z',
  links: [{ linkId: 'existing-link', type: 'TRANSFER', roleLabel: 'Transfer in', memberCount: 2 }],
};

describe('TransactionLinkDialog (CD-7, CD-9)', () => {
  it('pre-filters candidate transactions and excludes already linked ones (CD-7)', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
      data: {
        content: [mockCandidateCreditDiffAccount, mockAlreadyLinkedCandidate],
        number: 0,
        size: 50,
        totalElements: 2,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    render(
      <TransactionLinkDialog
        initialTransaction={mockAnchorDebit}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Credit Counterpart')).toBeInTheDocument();
    });

    // Already linked item must be filtered out / not shown
    expect(screen.queryByText('Already Linked Item')).not.toBeInTheDocument();
  });

  it('renders align refund categories checkbox ONLY for REFUND linkType (CD-9)', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
      data: { content: [], number: 0, size: 50, totalElements: 0, totalPages: 0, first: true, last: true, empty: false },
    });

    render(
      <TransactionLinkDialog
        initialTransaction={mockAnchorDebit}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    // Default TRANSFER linkType -> no align refund checkbox
    expect(screen.queryByText(/Align refund category/i)).not.toBeInTheDocument();

    // Change linkType to REFUND
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    const refundOption = screen.getByText('Refund / Partial Refund');
    fireEvent.click(refundOption);

    // Checkbox should now be visible
    expect(screen.getByText(/Align refund category/i)).toBeInTheDocument();
  });

  it('submits link payload with manual mismatched amounts accepted (CD-7)', async () => {
    const createLinkSpy = vi.spyOn(linkActions, 'createTransactionLink').mockResolvedValue({
      success: true,
      data: {
        id: 'new-link',
        type: 'REFUND',
        createdBy: 'USER',
        createdAt: '2026-07-25T00:00:00Z',
        members: [],
      },
    });

    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
      data: {
        // Mismatched amount + date candidate
        content: [{ ...mockCandidateCreditDiffAccount, amount: 2000, date: '2026-07-20' }],
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
      <TransactionLinkDialog
        initialTransaction={mockAnchorDebit}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    // Switch to REFUND
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Refund / Partial Refund'));

    // Wait for candidate search to load mismatched item
    await waitFor(() => {
      expect(screen.getByText('Credit Counterpart')).toBeInTheDocument();
    });

    // Click Add on candidate
    fireEvent.click(screen.getByText('Add'));

    // Submit link
    const submitBtn = screen.getByRole('button', { name: /Link Transactions/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createLinkSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REFUND',
          members: [
            { transactionId: 't-anchor', isAnchor: true },
            { transactionId: 't-cand-1', isAnchor: false },
          ],
          alignRefundCategories: true,
        }),
      );
    });
  });

  it('handles link submission failure with error message', async () => {
    vi.spyOn(linkActions, 'createTransactionLink').mockResolvedValue({
      success: false,
      error: { code: 'ERR', message: 'Failed to create link', timestamp: '' },
    });

    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
      data: {
        content: [mockCandidateCreditDiffAccount],
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
      <TransactionLinkDialog
        initialTransaction={mockAnchorDebit}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Credit Counterpart')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add'));

    const submitBtn = screen.getByRole('button', { name: /Link Transactions/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(linkActions.createTransactionLink).toHaveBeenCalled();
    });
  });

  it('allows changing anchor transaction radio and filtering candidates by search text', async () => {
    vi.spyOn(transactionsActions, 'searchTransactions').mockResolvedValue({
      success: true,
      data: {
        content: [mockCandidateCreditDiffAccount],
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
      <TransactionLinkDialog
        initialTransaction={mockAnchorDebit}
        accounts={mockAccounts}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Credit Counterpart')).toBeInTheDocument();
    });

    // Add candidate
    fireEvent.click(screen.getByText('Add'));

    // Radio button to set candidate as parent (anchor)
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]);

    // Type in candidate search box
    const searchInput = screen.getByPlaceholderText('Search by description or amount...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No matching counterpart transactions found')).toBeInTheDocument();
  });
});
