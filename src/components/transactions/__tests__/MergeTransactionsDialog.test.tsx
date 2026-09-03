import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MergeTransactionsDialog } from '@/components/transactions/MergeTransactionsDialog';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

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
  },
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
    renderWithQuery(
      <MergeTransactionsDialog
        open={true}
        onOpenChange={vi.fn()}
        tx1={txAlert}
        tx2={txStatement}
        accounts={mockAccounts}
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
    renderWithQuery(
      <MergeTransactionsDialog
        open={true}
        onOpenChange={vi.fn()}
        tx1={txAlert}
        tx2={txStatement}
        accounts={mockAccounts}
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

    renderWithQuery(
      <MergeTransactionsDialog
        open={true}
        onOpenChange={vi.fn()}
        tx1={txStatement}
        tx2={txOtherAcc}
        accounts={mockAccounts}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Cross-Account Merge Blocked/i)).toBeInTheDocument();
    const mergeBtn = screen.getByRole('button', { name: /Merge and resolve/i });
    expect(mergeBtn).toBeDisabled();
  });

  it('calls the merge endpoint and onSuccess callback on submit', async () => {
    (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        keptId: 'tx-stmt-1',
        reviewType: 'MANUALLY_REVIEWED',
        remainingReasons: [],
      },
    });

    const onSuccessMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    renderWithQuery(
      <MergeTransactionsDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        tx1={txStatement}
        tx2={txAlert}
        accounts={mockAccounts}
        onSuccess={onSuccessMock}
      />
    );

    const mergeBtn = screen.getByRole('button', { name: /Merge and resolve/i });
    fireEvent.click(mergeBtn);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/merge', {
        body: { keepId: 'tx-stmt-1', deleteId: 'tx-alert-1' },
      });
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });
});
