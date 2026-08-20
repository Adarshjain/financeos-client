import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as transactionsActions from '@/actions/transactions';
import { MergeTransactionsDialog } from '@/components/transactions/MergeTransactionsDialog';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
  {
    id: 'acc2',
    name: 'ICICI Card',
    type: AccountType.CREDIT_CARD,
    last4: '1234',
    creditLimit: 100000,
    paymentDueDay: 15,
    gracePeriodDays: 3,
  },
];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Shopping' },
];

const txStatement: Transaction = {
  id: 'tx-stmt-1',
  accountId: 'acc1',
  date: '2026-06-15',
  amount: 1500,
  description: 'Statement Line',
  sourcedDescription: 'STATEMENT LINE',
  source: 'gmail_statement',
  reviewType: 'NEEDS_REVIEW',
  reviewReasons: ['UNRECONCILED'],
  balance: 15000,
  createdAt: '2026-06-15T00:00:00Z',
};

const txAlert: Transaction = {
  id: 'tx-alert-1',
  accountId: 'acc1',
  date: '2026-06-15',
  amount: 1500,
  description: 'Alert Line',
  sourcedDescription: 'ALERT LINE',
  source: 'gmail_transaction_alert',
  reviewType: 'NEEDS_REVIEW',
  reviewReasons: ['DUPLICATE_SUSPECT'],
  balance: 15000,
  createdAt: '2026-06-15T01:00:00Z',
};

describe('MergeTransactionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults Keep selection to gmail_statement over gmail_transaction_alert', () => {
    render(
      <MergeTransactionsDialog
        open={true}
        onOpenChange={vi.fn()}
        tx1={txAlert}
        tx2={txStatement}
        accounts={mockAccounts}
        categories={mockCategories}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Merge Transactions')).toBeInTheDocument();
    // Keep transaction badge should be on gmail_statement card
    const keepBadges = screen.getAllByText('Keep Transaction');
    expect(keepBadges).toHaveLength(1);
    expect(screen.getByText('Delete (Merge In)')).toBeInTheDocument();
  });

  it('allows flipping Keep/Delete selection by clicking a card', () => {
    render(
      <MergeTransactionsDialog
        open={true}
        onOpenChange={vi.fn()}
        tx1={txAlert}
        tx2={txStatement}
        accounts={mockAccounts}
        categories={mockCategories}
        onSuccess={vi.fn()}
      />
    );

    // Click alert transaction card to select it as Keep
    const alertDesc = screen.getByText('Alert Line');
    fireEvent.click(alertDesc);

    // Verify selection flipped
    const keepBadges = screen.getAllByText('Keep Transaction');
    expect(keepBadges).toHaveLength(1);
  });

  it('shows cross-account warning and disables Merge button when accounts differ', () => {
    const txOtherAcc: Transaction = {
      ...txAlert,
      id: 'tx-other-acc',
      accountId: 'acc2',
    };

    render(
      <MergeTransactionsDialog
        open={true}
        onOpenChange={vi.fn()}
        tx1={txStatement}
        tx2={txOtherAcc}
        accounts={mockAccounts}
        categories={mockCategories}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Cross-Account Merge Blocked/i)).toBeInTheDocument();
    const mergeBtn = screen.getByRole('button', { name: /Merge and resolve/i });
    expect(mergeBtn).toBeDisabled();
  });

  it('calls mergeTransactions action and onSuccess callback on submit', async () => {
    const mergeSpy = vi.spyOn(transactionsActions, 'mergeTransactions').mockResolvedValue({
      success: true,
      data: {
        keptId: 'tx-stmt-1',
        reviewType: 'MANUALLY_REVIEWED',
        remainingReasons: [],
      },
    });

    const onSuccessMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <MergeTransactionsDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        tx1={txStatement}
        tx2={txAlert}
        accounts={mockAccounts}
        categories={mockCategories}
        onSuccess={onSuccessMock}
      />
    );

    const mergeBtn = screen.getByRole('button', { name: /Merge and resolve/i });
    fireEvent.click(mergeBtn);

    await waitFor(() => {
      expect(mergeSpy).toHaveBeenCalledWith('tx-stmt-1', 'tx-alert-1');
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });
});
