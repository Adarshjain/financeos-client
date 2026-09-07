import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TransactionCard } from '@/components/transactions/TransactionCard';
import type { Account } from '@/lib/account.types';
import type { ObligationRef, Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Bank', type: AccountType.BANK_ACCOUNT },
];

const baseTxn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -500,
  description: 'Dinner split',
  sourcedDescription: 'DINNER SPLIT',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  createdAt: '2026-07-25T00:00:00Z',
};

describe('TransactionCard obligation ref badges', () => {
  it('renders an ObligationRefBadges label for each obligationRef on the transaction', () => {
    const refs: ObligationRef[] = [
      { kind: 'LENDING', id: 'ref-1', parentId: 'cp-1', label: 'Rahul Sharma', amount: 500 },
      { kind: 'LOAN_PAYMENT', id: 'ref-2', parentId: 'loan-1', label: 'Home Loan #3' },
    ];

    render(
      <TransactionCard
        transaction={{ ...baseTxn, obligationRefs: refs }}
        accounts={mockAccounts}
      />,
    );

    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('Home Loan #3')).toBeInTheDocument();
  });

  it('renders no obligation badge when the transaction has no obligationRefs', () => {
    render(<TransactionCard transaction={baseTxn} accounts={mockAccounts} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
