import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionDetailDialog } from '@/components/transactions/TransactionDetailDialog';
import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const accounts: Account[] = [{ id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];

const txn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -300,
  description: 'Coffee',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  createdAt: '2026-07-25T00:00:00Z',
};

describe('TransactionDetailDialog — controlled mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens from `open` alone, with no trigger', () => {
    renderWithQuery(<TransactionDetailDialog transaction={txn} accounts={accounts} open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
  });

  it('renders nothing while `open` is false', () => {
    renderWithQuery(
      <TransactionDetailDialog transaction={txn} accounts={accounts} open={false} onOpenChange={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument();
  });

  it('reports a dismissal through onOpenChange and leaves closing to the parent', () => {
    const onOpenChange = vi.fn();
    renderWithQuery(<TransactionDetailDialog transaction={txn} accounts={accounts} open onOpenChange={onOpenChange} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Controlled: still open until the parent flips `open`.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes when the parent flips `open` to false', () => {
    const { rerender } = renderWithQuery(
      <TransactionDetailDialog transaction={txn} accounts={accounts} open onOpenChange={vi.fn()} />,
    );
    rerender(<TransactionDetailDialog transaction={txn} accounts={accounts} open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('with a trigger and `open`, a trigger click only asks the parent to open', () => {
    const onOpenChange = vi.fn();
    renderWithQuery(
      <TransactionDetailDialog
        transaction={txn}
        accounts={accounts}
        open={false}
        onOpenChange={onOpenChange}
        trigger={<button>Open Detail</button>}
      />,
    );
    fireEvent.click(screen.getByText('Open Detail'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uncontrolled with a trigger still notifies onOpenChange', () => {
    const onOpenChange = vi.fn();
    renderWithQuery(
      <TransactionDetailDialog
        transaction={txn}
        accounts={accounts}
        onOpenChange={onOpenChange}
        trigger={<button>Open Detail</button>}
      />,
    );
    fireEvent.click(screen.getByText('Open Detail'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('Coffee')).toBeInTheDocument();
  });
});
