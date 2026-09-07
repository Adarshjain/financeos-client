import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { useTransactionLink } from '@/components/transactions/link-dialog/useTransactionLink';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

type Mock = ReturnType<typeof vi.fn>;

const accounts: Account[] = [
  { id: 'acc1', name: 'Acc 1', type: AccountType.BANK_ACCOUNT },
  { id: 'acc2', name: 'Acc 2', type: AccountType.BANK_ACCOUNT },
];

function makeTxn(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    accountId: 'acc1',
    date: '2026-07-25',
    amount: -500,
    description: 'Txn',
    source: 'manual',
    createdAt: '2026-07-25T00:00:00Z',
    ...overrides,
  };
}

function pagedResponse(content: Transaction[]) {
  return {
    content,
    number: 0,
    size: 50,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useTransactionLink disabledKinds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([]) });
  });

  it('disables both record kinds with the single-transaction reason for a multi-selection with no explicit subject', () => {
    const t1 = makeTxn({ id: 't1' });
    const t2 = makeTxn({ id: 't2' });

    const { result } = renderHook(
      () =>
        useTransactionLink({
          initialSelectedTransactions: [t1, t2],
          accounts,
          open: true,
          onOpenChange: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.disabledKinds.LENDING).toBe(
      'Select a single transaction to record a lending or loan payment',
    );
    expect(result.current.disabledKinds.LOAN_PAYMENT).toBe(
      'Select a single transaction to record a lending or loan payment',
    );
  });

  it('disables LENDING and LOAN_PAYMENT for a subject already linked to a non-LENDING (loan) obligation', () => {
    const subject = makeTxn({
      id: 't1',
      obligationRefs: [{ kind: 'LOAN_EVENT', id: 'r1', label: 'Rate change' }],
    });

    const { result } = renderHook(
      () =>
        useTransactionLink({
          initialTransaction: subject,
          accounts,
          open: true,
          onOpenChange: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.disabledKinds.LENDING).toMatch(/loan record/i);
    expect(result.current.disabledKinds.LOAN_PAYMENT).toMatch(/ledger\/loan record/i);
  });

  it('leaves LENDING enabled but disables LOAN_PAYMENT for a subject already linked to a LENDING ref', () => {
    const subject = makeTxn({
      id: 't1',
      obligationRefs: [{ kind: 'LENDING', id: 'r1', label: 'Rahul Sharma' }],
    });

    const { result } = renderHook(
      () =>
        useTransactionLink({
          initialTransaction: subject,
          accounts,
          open: true,
          onOpenChange: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.disabledKinds.LENDING).toBeUndefined();
    expect(result.current.disabledKinds.LOAN_PAYMENT).toMatch(/ledger\/loan record/i);
  });

  it('disables LOAN_PAYMENT with the debit-only reason for a CREDIT subject with no refs, leaving LENDING enabled', () => {
    const subject = makeTxn({ id: 't1', amount: 500 });

    const { result } = renderHook(
      () =>
        useTransactionLink({
          initialTransaction: subject,
          accounts,
          open: true,
          onOpenChange: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.disabledKinds.LOAN_PAYMENT).toMatch(/debit/i);
    expect(result.current.disabledKinds.LENDING).toBeUndefined();
  });

  it('leaves both record kinds enabled for a DEBIT subject with no refs', () => {
    const subject = makeTxn({ id: 't1', amount: -500 });

    const { result } = renderHook(
      () =>
        useTransactionLink({
          initialTransaction: subject,
          accounts,
          open: true,
          onOpenChange: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.disabledKinds).toEqual({});
  });
});

describe('useTransactionLink open/reset behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([]) });
  });

  it('resets kind to TRANSFER whenever the dialog (re)opens', async () => {
    const subject = makeTxn({ id: 't1' });

    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) =>
        useTransactionLink({
          initialTransaction: subject,
          accounts,
          open,
          onOpenChange: vi.fn(),
        }),
      { wrapper: createWrapper(), initialProps: { open: true } },
    );

    expect(result.current.kind).toBe('TRANSFER');

    act(() => result.current.setKind('LENDING'));
    expect(result.current.kind).toBe('LENDING');

    // Closing must not itself reset the kind.
    rerender({ open: false });
    expect(result.current.kind).toBe('LENDING');

    // Re-opening resets back to TRANSFER.
    rerender({ open: true });
    await waitFor(() => expect(result.current.kind).toBe('TRANSFER'));
  });
});

describe('useTransactionLink filteredCandidates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes candidates carrying any obligationRefs, regardless of kind (symmetric hide)', async () => {
    const subject = makeTxn({ id: 't-subject', accountId: 'acc1', amount: -500 });
    const withLendingRef = makeTxn({
      id: 't-with-ref',
      accountId: 'acc2',
      amount: 500,
      obligationRefs: [{ kind: 'LENDING', id: 'r1', label: 'Rahul Sharma' }],
    });
    const clean = makeTxn({ id: 't-clean', accountId: 'acc2', amount: 500 });

    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([withLendingRef, clean]) });

    const { result } = renderHook(
      () =>
        useTransactionLink({
          initialTransaction: subject,
          accounts,
          open: true,
          onOpenChange: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.filteredCandidates.map((c) => c.id)).toEqual(['t-clean']);
    });
  });
});
