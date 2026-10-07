import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { useTransactionLink } from '@/components/transactions/link-dialog/useTransactionLink';
import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

const accounts: Account[] = [{ id: 'acc1', name: 'Acc 1', type: AccountType.BANK_ACCOUNT }];

const makeTxn = (o: Partial<Transaction> & { id: string }): Transaction => ({
  accountId: 'acc1',
  date: '2026-07-25',
  amount: 500,
  description: 'Txn',
  source: 'manual',
  createdAt: '2026-07-25T00:00:00Z',
  ...o,
});

function disabled(props: { initialTransaction?: Transaction; initialSelectedTransactions?: Transaction[] }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result } = renderHook(
    () => useTransactionLink({ accounts, open: true, onOpenChange: vi.fn(), ...props }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    },
  );
  return result.current.disabledKinds;
}

describe('useTransactionLink disabledKinds DIVIDEND', () => {
  it('is disabled for a bulk selection', () => {
    const d = disabled({
      initialSelectedTransactions: [makeTxn({ id: 'a' }), makeTxn({ id: 'b' })],
    });
    expect(d.DIVIDEND).toBe('Select a single transaction to record a lending, loan payment or dividend');
  });

  it.each(['LENDING', 'LOAN_PAYMENT', 'DIVIDEND'] as const)(
    'is disabled when the subject already has a %s ref',
    (kind) => {
      const d = disabled({
        initialTransaction: makeTxn({ id: 't', obligationRefs: [{ kind, id: 'r1', label: 'x' }] }),
      });
      expect(d.DIVIDEND).toBe('Already linked to a ledger/loan/dividend record');
    },
  );

  it('is disabled for a debit', () => {
    const d = disabled({ initialTransaction: makeTxn({ id: 't', amount: -100 }) });
    expect(d.DIVIDEND).toBe('Dividends must be money-in (credit) transactions');
  });

  it('is enabled for an unlinked credit', () => {
    const d = disabled({ initialTransaction: makeTxn({ id: 't', amount: 100 }) });
    expect(d.DIVIDEND).toBeUndefined();
  });

  it('LENDING reads "Already linked to a loan or dividend record" for a non-LENDING ref', () => {
    const d = disabled({
      initialTransaction: makeTxn({
        id: 't',
        obligationRefs: [{ kind: 'DIVIDEND', id: 'r1', label: 'Dividend · X' }],
      }),
    });
    expect(d.LENDING).toBe('Already linked to a loan or dividend record');
  });
});
