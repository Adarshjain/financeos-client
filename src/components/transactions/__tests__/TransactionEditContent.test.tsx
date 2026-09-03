import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionEditContent } from '@/components/transactions/TransactionEditContent';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

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

describe('TransactionEditContent', () => {
  it('renders TransactionCRUD in edit mode with header title', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(keys.accounts.list(), mockAccounts);
    queryClient.setQueryData(keys.categories.list(), mockCategories);

    renderWithQuery(
      <Dialog open={true}>
        <DialogContent>
          <TransactionEditContent
            transaction={mockTxn}
            onSuccess={vi.fn()}
            onCancel={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
      { queryClient },
    );

    expect(screen.getByText('Edit Transaction')).toBeInTheDocument();
  });
});
