import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { TransactionPicker } from '@/components/transactions/TransactionPicker';
import type { PickerTransaction } from '@/components/transactions/useTransactionPicker';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

type Mock = ReturnType<typeof vi.fn>;

const mockAccounts: Account[] = [{ id: 'acc-1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];

function makeTxn(overrides: Partial<PickerTransaction> & { id: string }): PickerTransaction {
  return {
    accountId: 'acc-1',
    amount: -500,
    categories: [],
    createdAt: '2026-07-25T00:00:00Z',
    date: '2026-07-25',
    isTransactionExcluded: false,
    isTransactionUnderMonitoring: false,
    links: [],
    obligationRefs: [],
    reviewReasons: [],
    source: 'manual',
    updatedAt: '2026-07-25T00:00:00Z',
    description: 'Grocery run',
    ...overrides,
  } as PickerTransaction;
}

function pagedResponse(content: PickerTransaction[]) {
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

function renderPicker(ui: Parameters<typeof renderWithQuery>[0]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.accounts.list(), mockAccounts);
  return renderWithQuery(ui, { queryClient });
}

describe('TransactionPicker loan-mode rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([]) });
  });

  it('renders the `ruleHint` override in the empty state instead of the direction-derived default', async () => {
    renderPicker(
      <TransactionPicker
        value={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        type="DEBIT"
        ruleHint="EMI settlements link money-out (debit) transactions"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No matching transactions')).toBeInTheDocument();
    });
    expect(
      screen.getByText('EMI settlements link money-out (debit) transactions'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Lent entries link money-out (debit) transactions.'),
    ).not.toBeInTheDocument();
  });

  it('hides a row carrying an obligationRef entirely (and never shows its "also linked" hint) when excludeAnyObligationRef is set', async () => {
    (api.POST as Mock).mockResolvedValue({
      data: pagedResponse([
        makeTxn({
          id: 'split-1',
          obligationRefs: [{ kind: 'LENDING', id: 'op-1', label: 'Rahul Sharma' }],
        }),
      ]),
    });

    renderPicker(
      <TransactionPicker
        value={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        type={null}
        excludeAnyObligationRef
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No matching transactions')).toBeInTheDocument();
    });
    expect(screen.queryByText('Grocery run')).not.toBeInTheDocument();
    expect(screen.queryByText(/also linked to/)).not.toBeInTheDocument();
  });

  it('shows a row with the same obligationRef, and its "also linked" hint, when excludeAnyObligationRef is left at its default', async () => {
    (api.POST as Mock).mockResolvedValue({
      data: pagedResponse([
        makeTxn({
          id: 'split-1',
          obligationRefs: [{ kind: 'LENDING', id: 'op-1', label: 'Rahul Sharma' }],
        }),
      ]),
    });

    renderPicker(
      <TransactionPicker value={null} onSelect={vi.fn()} onClear={vi.fn()} type={null} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Grocery run')).toBeInTheDocument();
    });
    expect(screen.getByText('also linked to 1 ledger entry')).toBeInTheDocument();
  });
});
