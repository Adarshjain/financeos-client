import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionDetailDialog } from '@/components/transactions/TransactionDetailDialog';
import { DialogTitle } from '@/components/ui/dialog';
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

const placeholder = (
  <>
    <DialogTitle>Transaction</DialogTitle>
    <p>Loading the transaction</p>
  </>
);

describe('TransactionDetailDialog — placeholder while the transaction loads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the placeholder in the open dialog, with a close button', () => {
    renderWithQuery(
      <TransactionDetailDialog transaction={null} accounts={[]} open onOpenChange={vi.fn()} placeholder={placeholder} />,
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('Loading the transaction');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('closes from the placeholder through onOpenChange', () => {
    const onOpenChange = vi.fn();
    renderWithQuery(
      <TransactionDetailDialog transaction={null} accounts={[]} open onOpenChange={onOpenChange} placeholder={placeholder} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('swaps the details into the same dialog when the transaction arrives, dropping the extra close', () => {
    const { rerender } = renderWithQuery(
      <TransactionDetailDialog transaction={null} accounts={[]} open onOpenChange={vi.fn()} placeholder={placeholder} />,
    );
    const dialog = screen.getByRole('dialog');
    rerender(
      <TransactionDetailDialog transaction={txn} accounts={accounts} open onOpenChange={vi.fn()} placeholder={placeholder} />,
    );
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(dialog).toHaveTextContent('Coffee');
    expect(dialog).not.toHaveTextContent('Loading the transaction');
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});
