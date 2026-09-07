import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { DeleteTransaction } from '@/components/transactions/DeleteTransaction';
import type { ObligationRef, Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const baseTxn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -500,
  description: 'Dinner split',
  source: 'manual',
  createdAt: '2026-07-25T00:00:00Z',
};

function openDialog(transaction: Transaction) {
  renderWithQuery(<DeleteTransaction transaction={transaction} onSuccess={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
}

describe('DeleteTransaction obligationRefs warning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes the singular "linked to 1 loan/lending record" sentence when exactly one ref exists', () => {
    const refs: ObligationRef[] = [{ kind: 'LENDING', id: 'r1', parentId: 'cp-1', label: 'Rahul Sharma' }];
    openDialog({ ...baseTxn, obligationRefs: refs });

    expect(
      screen.getByText(
        /It is linked to 1 loan\/lending record \(Rahul Sharma\); the record will stay but lose the link\./,
      ),
    ).toBeInTheDocument();
  });

  it('includes the plural "linked to N loan/lending records" sentence with all labels when multiple refs exist', () => {
    const refs: ObligationRef[] = [
      { kind: 'LENDING', id: 'r1', parentId: 'cp-1', label: 'Rahul Sharma' },
      { kind: 'LOAN_PAYMENT', id: 'r2', parentId: 'loan-1', label: 'Home Loan EMI #3' },
    ];
    openDialog({ ...baseTxn, obligationRefs: refs });

    expect(
      screen.getByText(
        /It is linked to 2 loan\/lending records \(Rahul Sharma, Home Loan EMI #3\); the records will stay but lose the link\./,
      ),
    ).toBeInTheDocument();
  });

  it('omits the obligation-refs sentence entirely when there are no refs', () => {
    openDialog(baseTxn);

    expect(screen.queryByText(/loan\/lending record/i)).not.toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this transaction?')).toBeInTheDocument();
  });
});
