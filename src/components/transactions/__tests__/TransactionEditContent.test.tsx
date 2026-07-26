import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionEditContent } from '@/components/transactions/TransactionEditContent';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { Transaction } from '@/lib/transaction.types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: 'bank_account' },
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

import { Dialog, DialogContent } from '@/components/ui/dialog';

describe('TransactionEditContent', () => {
  it('renders TransactionCRUD in edit mode with header title', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <TransactionEditContent
            transaction={mockTxn}
            accounts={mockAccounts}
            categories={mockCategories}
            onSuccess={vi.fn()}
            onClose={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByText('Edit Transaction')).toBeInTheDocument();
  });
});
