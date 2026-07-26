import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionFormWrapper } from '@/components/transactions/TransactionFormWrapper';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: 'bank_account' },
];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Food' },
];

describe('TransactionFormWrapper', () => {
  it('renders trigger button and opens dialog form', () => {
    const onSuccess = vi.fn();
    render(
      <TransactionFormWrapper
        accounts={mockAccounts}
        categories={mockCategories}
        onSuccess={onSuccess}
        trigger={<button>Add Txn</button>}
      />,
    );

    expect(screen.getByText('Add Txn')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Add Txn'));

    expect(screen.getByText('New Transaction')).toBeInTheDocument();
  });
});
