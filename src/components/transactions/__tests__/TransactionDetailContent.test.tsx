import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as linkActions from '@/actions/transaction-links';
import { TransactionDetailContent } from '@/components/transactions/TransactionDetailContent';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: 'bank_account' },
];

const mockTxnWithZeroBalance: Transaction = {
  id: 't-zero',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -100,
  description: 'Zero balance item',
  sourcedDescription: 'Zero balance item',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  balance: 0, // Falsy number 0 must be displayed! (CD-2c)
  createdAt: '2026-07-25T00:00:00Z',
};

const mockTxnWithNullBalance: Transaction = {
  id: 't-null',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -100,
  description: 'Null balance item',
  sourcedDescription: 'Null balance item',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  balance: null,
  createdAt: '2026-07-25T00:00:00Z',
};

describe('TransactionDetailContent (CD-2c, CD-8)', () => {
  it('displays balance when balance = 0 (falsy number) (CD-2c)', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={mockTxnWithZeroBalance}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onDeleteSuccess={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByText('Balance: ₹0.00')).toBeInTheDocument();
  });

  it('omits balance block when balance is null (CD-2c)', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={mockTxnWithNullBalance}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onDeleteSuccess={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText(/Balance:/i)).not.toBeInTheDocument();
  });

  it('fetches and displays linked transactions with derived role labels (CD-8)', async () => {
    vi.spyOn(linkActions, 'getTransactionLinks').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'link1',
          type: 'TRANSFER',
          createdBy: 'USER',
          createdAt: '2026-07-25T00:00:00Z',
          members: [
            {
              transactionId: 't-zero',
              date: '2026-07-25',
              signedAmount: -100,
              description: 'Zero balance item',
              accountId: 'acc1',
              isAnchor: true,
              roleLabel: 'Transfer out',
            },
            {
              transactionId: 't-counterpart',
              date: '2026-07-25',
              signedAmount: 100,
              description: 'Transfer Counterpart',
              accountId: 'acc2',
              isAnchor: false,
              roleLabel: 'Transfer in',
            },
          ],
        },
      ],
    });

    const txnWithLink: Transaction = {
      ...mockTxnWithZeroBalance,
      links: [{ linkId: 'link1', type: 'TRANSFER', roleLabel: 'Transfer out', memberCount: 2 }],
    };

    render(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={txnWithLink}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onDeleteSuccess={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Transfer Counterpart')).toBeInTheDocument();
      expect(screen.getByText('Transfer in')).toBeInTheDocument();
    });
  });

  it('renders linksError with retry button when link fetch fails', async () => {
    vi.spyOn(linkActions, 'getTransactionLinks').mockResolvedValue({
      success: false,
      error: { code: 'ERR', message: 'Failed to load links', timestamp: '' },
    });

    const txnWithLink: Transaction = {
      ...mockTxnWithZeroBalance,
      links: [{ linkId: 'link1', type: 'TRANSFER', roleLabel: 'Transfer out', memberCount: 2 }],
    };

    render(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={txnWithLink}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onDeleteSuccess={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load links: Failed to load links/i)).toBeInTheDocument();
    });
  });

  it('unlinks transaction link when Unlink button is clicked', async () => {
    vi.spyOn(linkActions, 'getTransactionLinks').mockResolvedValue({
      success: true,
      data: [
        {
          id: 'link1',
          type: 'TRANSFER',
          createdBy: 'USER',
          createdAt: '2026-07-25T00:00:00Z',
          members: [
            {
              transactionId: 't-zero',
              date: '2026-07-25',
              signedAmount: -100,
              description: 'Zero balance item',
              accountId: 'acc1',
              isAnchor: false,
              roleLabel: 'Transfer out',
            },
            {
              transactionId: 't-parent',
              date: '2026-07-25',
              signedAmount: 100,
              description: 'Parent Item',
              accountId: 'acc1',
              isAnchor: true,
              roleLabel: 'Parent Charge',
            },
          ],
        },
      ],
    });

    const unlinkSpy = vi.spyOn(linkActions, 'deleteTransactionLink').mockResolvedValue({
      success: true,
      data: undefined,
    });

    const txnWithLink: Transaction = {
      ...mockTxnWithZeroBalance,
      source: 'file_upload',
      mcc: '5812',
      links: [{ linkId: 'link1', type: 'TRANSFER', roleLabel: 'Transfer out', memberCount: 2 }],
    };

    const onDeleteSuccess = vi.fn();

    render(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={txnWithLink}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onDeleteSuccess={onDeleteSuccess}
          />
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Unlink')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Unlink'));

    await waitFor(() => {
      expect(unlinkSpy).toHaveBeenCalledWith('link1');
      expect(onDeleteSuccess).toHaveBeenCalled();
    });

    expect(screen.getByText('File Upload')).toBeInTheDocument();
    expect(screen.getByText('5812')).toBeInTheDocument();
  });
});
