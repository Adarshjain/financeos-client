import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionDetailDialog } from '@/components/transactions/TransactionDetailDialog';
import type { Account } from '@/lib/account.types';
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

describe('TransactionDetailDialog', () => {
  it('renders trigger and handles dialog open and edit click', () => {
    const onMutate = vi.fn();
    renderWithQuery(
      <TransactionDetailDialog
        transaction={mockTxn}
        accounts={mockAccounts}
        onMutate={onMutate}
        trigger={<button>Open Detail</button>}
      />,
    );

    expect(screen.getByText('Open Detail')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Open Detail'));

    expect(screen.getByText('Coffee')).toBeInTheDocument();
  });
});
