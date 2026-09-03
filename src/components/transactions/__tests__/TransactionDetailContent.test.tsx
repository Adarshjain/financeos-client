import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionDetailContent } from '@/components/transactions/TransactionDetailContent';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Account } from '@/lib/account.types';
import { api,ApiError } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays balance when balance = 0 (falsy number) (CD-2c)', () => {
    renderWithQuery(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={mockTxnWithZeroBalance}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onCloseAndRefresh={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByText('Balance: ₹0.00')).toBeInTheDocument();
  });

  it('omits balance block when balance is null (CD-2c)', () => {
    renderWithQuery(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={mockTxnWithNullBalance}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onCloseAndRefresh={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText(/Balance:/i)).not.toBeInTheDocument();
  });

  it('fetches and displays linked transactions with derived role labels (CD-8)', async () => {
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'link1',
          type: 'TRANSFER',
          createdBy: 'USER',
          createdAt: '2026-07-25T00:00:00Z',
          note: '',
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

    renderWithQuery(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={txnWithLink}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onCloseAndRefresh={vi.fn()}
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
    (api.GET as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(500, { code: 'ERR', message: 'Failed to load links', timestamp: '' }),
    );

    const txnWithLink: Transaction = {
      ...mockTxnWithZeroBalance,
      links: [{ linkId: 'link1', type: 'TRANSFER', roleLabel: 'Transfer out', memberCount: 2 }],
    };

    renderWithQuery(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={txnWithLink}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onCloseAndRefresh={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load links: Failed to load links/i)).toBeInTheDocument();
    });
  });

  it('unlinks transaction link when Unlink button is clicked', async () => {
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'link1',
          type: 'TRANSFER',
          createdBy: 'USER',
          createdAt: '2026-07-25T00:00:00Z',
          note: '',
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

    const unlinkSpy = (api.DELETE as ReturnType<typeof vi.fn>).mockResolvedValue({ data: undefined });

    const txnWithLink: Transaction = {
      ...mockTxnWithZeroBalance,
      source: 'file_upload',
      mcc: '5812',
      links: [{ linkId: 'link1', type: 'TRANSFER', roleLabel: 'Transfer out', memberCount: 2 }],
    };

    const onCloseAndRefresh = vi.fn();

    renderWithQuery(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={txnWithLink}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onCloseAndRefresh={onCloseAndRefresh}
          />
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Unlink')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Unlink'));

    await waitFor(() => {
      expect(unlinkSpy).toHaveBeenCalledWith('/api/v1/transaction-links/{id}', {
        params: { path: { id: 'link1' } },
      });
      expect(onCloseAndRefresh).toHaveBeenCalled();
    });

    expect(screen.getByText('File Upload')).toBeInTheDocument();
    expect(screen.getByText('5812')).toBeInTheDocument();
  });
});

describe('TransactionDetailContent review action', () => {
  const needsReviewTxn: Transaction = {
    ...mockTxnWithZeroBalance,
    id: 't-needs-review',
    reviewType: 'NEEDS_REVIEW',
    reviewReasons: ['UNRECONCILED'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDetail = (transaction: Transaction, onCloseAndRefresh = vi.fn()) => {
    renderWithQuery(
      <Dialog open={true}>
        <DialogContent>
          <TransactionDetailContent
            transaction={transaction}
            accounts={mockAccounts}
            onEditClick={vi.fn()}
            onCloseAndRefresh={onCloseAndRefresh}
          />
        </DialogContent>
      </Dialog>,
    );
    return onCloseAndRefresh;
  };

  it('offers the review action for a transaction that needs review', () => {
    renderDetail(needsReviewTxn);

    expect(screen.getByRole('button', { name: /Review/i })).toBeInTheDocument();
  });

  it('hides the review action for an already-reviewed transaction', () => {
    renderDetail(mockTxnWithZeroBalance);

    expect(screen.queryByRole('button', { name: /Review/i })).not.toBeInTheDocument();
    // The read-only status row stays regardless.
    expect(screen.getByText('Review Status')).toBeInTheDocument();
  });

  it('closes the dialog and refreshes the parent after approving from the detail view', async () => {
    (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { succeededIds: ['t-needs-review'], skippedIds: [], failures: [] },
    });
    const onCloseAndRefresh = renderDetail(needsReviewTxn);

    fireEvent.click(screen.getByRole('button', { name: /Review/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Approve Transaction' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Approv/i }));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/transactions/batch-review', {
        body: {
          transactionIds: ['t-needs-review'],
          reviewType: 'MANUALLY_REVIEWED',
          reviewReasons: ['UNRECONCILED'],
        },
      });
      expect(onCloseAndRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
