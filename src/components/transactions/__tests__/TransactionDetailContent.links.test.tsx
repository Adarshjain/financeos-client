import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { TransactionDetailContent } from '@/components/transactions/TransactionDetailContent';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Account } from '@/lib/account.types';
import type { ObligationRef, Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

const mockAccounts: Account[] = [{ id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];

const baseTxn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -500,
  description: 'Dinner split',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  createdAt: '2026-07-25T00:00:00Z',
};

function renderDetail(transaction: Transaction) {
  return renderWithQuery(
    <Dialog open={true}>
      <DialogContent>
        <TransactionDetailContent
          transaction={transaction}
          accounts={mockAccounts}
          onEditClick={vi.fn()}
          onCloseAndRefresh={vi.fn()}
        />
      </DialogContent>
    </Dialog>,
  );
}

describe('TransactionDetailContent link/lending actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no standalone "Lending" action button', () => {
    renderDetail(baseTxn);

    expect(screen.queryByRole('button', { name: /Lending/i })).not.toBeInTheDocument();
  });

  it('offers "Link to…" and "Edit" as the two actions', () => {
    renderDetail(baseTxn);

    expect(screen.getByRole('button', { name: /Link to/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('mounts the LinksSection when the transaction carries obligationRefs', () => {
    const refs: ObligationRef[] = [
      { kind: 'LENDING', id: 'r1', parentId: 'cp-1', label: 'Rahul Sharma', amount: 500 },
    ];
    renderDetail({ ...baseTxn, obligationRefs: refs });

    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.getByText('Ledger & loans')).toBeInTheDocument();
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
  });
});
