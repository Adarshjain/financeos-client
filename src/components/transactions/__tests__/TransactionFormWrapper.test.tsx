import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionFormWrapper } from '@/components/transactions/TransactionFormWrapper';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import { keys } from '@/lib/query/keys';
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

describe('TransactionFormWrapper', () => {
  it('renders trigger button and opens dialog form', () => {
    const onSuccess = vi.fn();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(keys.accounts.list(), mockAccounts);
    queryClient.setQueryData(keys.categories.list(), mockCategories);

    renderWithQuery(
      <TransactionFormWrapper
        onSuccess={onSuccess}
        trigger={<button>Add Txn</button>}
      />,
      { queryClient },
    );

    expect(screen.getByText('Add Txn')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Add Txn'));

    expect(screen.getByText('New Transaction')).toBeInTheDocument();
  });
});
