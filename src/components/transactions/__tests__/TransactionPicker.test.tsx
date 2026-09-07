import { fireEvent, screen, waitFor } from '@testing-library/react';
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

describe('TransactionPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([]) });
  });

  it('renders the search box and the fetched candidate rows', async () => {
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([makeTxn({ id: 'cand-1' })]) });

    renderPicker(
      <TransactionPicker value={null} onSelect={vi.fn()} onClear={vi.fn()} direction="lent" />,
    );

    expect(screen.getByPlaceholderText('Search by description or amount...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Grocery run')).toBeInTheDocument();
    });
  });

  it('calls onSelect with the chosen transaction when a row is selected', async () => {
    (api.POST as Mock).mockResolvedValue({ data: pagedResponse([makeTxn({ id: 'cand-1' })]) });
    const onSelect = vi.fn();

    renderPicker(
      <TransactionPicker value={null} onSelect={onSelect} onClear={vi.fn()} direction="lent" />,
    );

    await waitFor(() => {
      expect(screen.getByText('Grocery run')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'cand-1' }));
  });

  it('renders a selected chip with description, account, date, amount, and Change/Remove actions', () => {
    const onClear = vi.fn();

    renderPicker(
      <TransactionPicker
        value={{
          id: 'sel-1',
          description: 'Dinner split',
          date: '2026-07-25',
          accountId: 'acc-1',
          signedAmount: -500,
        }}
        onSelect={vi.fn()}
        onClear={onClear}
        direction="lent"
      />,
    );

    expect(screen.getByText('Dinner split')).toBeInTheDocument();
    expect(screen.getByText(/HDFC Savings/)).toBeInTheDocument();
    expect(screen.getByText('-₹500.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('reopens the search UI when "Change" is clicked on a selected chip', () => {
    renderPicker(
      <TransactionPicker
        value={{
          id: 'sel-1',
          description: 'Dinner split',
          date: '2026-07-25',
          accountId: 'acc-1',
          signedAmount: -500,
        }}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        direction="lent"
      />,
    );

    expect(screen.queryByPlaceholderText('Search by description or amount...')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));

    expect(screen.getByPlaceholderText('Search by description or amount...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel change' })).toBeInTheDocument();
  });

  it('shows the lent-direction rule hint in the empty state', async () => {
    renderPicker(
      <TransactionPicker value={null} onSelect={vi.fn()} onClear={vi.fn()} direction="lent" />,
    );

    await waitFor(() => {
      expect(screen.getByText('No matching transactions')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Lent entries link money-out (debit) transactions.'),
    ).toBeInTheDocument();
  });

  it('shows the borrowed-direction rule hint in the empty state', async () => {
    renderPicker(
      <TransactionPicker value={null} onSelect={vi.fn()} onClear={vi.fn()} direction="borrowed" />,
    );

    await waitFor(() => {
      expect(screen.getByText('No matching transactions')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Borrowed entries link money-in (credit) transactions.'),
    ).toBeInTheDocument();
  });

  it('shows the "also linked to N ledger entries" hint for rows already split across LENDING refs', async () => {
    (api.POST as Mock).mockResolvedValue({
      data: pagedResponse([
        makeTxn({
          id: 'split-1',
          obligationRefs: [
            { kind: 'LENDING', id: 'op-1', label: 'Rahul Sharma' },
            { kind: 'LENDING', id: 'op-2', label: 'Priya Singh' },
          ],
        }),
      ]),
    });

    renderPicker(
      <TransactionPicker value={null} onSelect={vi.fn()} onClear={vi.fn()} direction="lent" />,
    );

    await waitFor(() => {
      expect(screen.getByText('also linked to 2 ledger entries')).toBeInTheDocument();
    });
  });

  it('disables the search input and hides chip actions when disabled', async () => {
    renderPicker(
      <TransactionPicker value={null} onSelect={vi.fn()} onClear={vi.fn()} direction="lent" disabled />,
    );

    expect(screen.getByPlaceholderText('Search by description or amount...')).toBeDisabled();

    renderPicker(
      <TransactionPicker
        value={{
          id: 'sel-1',
          description: 'Dinner split',
          date: '2026-07-25',
          accountId: 'acc-1',
          signedAmount: -500,
        }}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        direction="lent"
        disabled
      />,
    );

    expect(screen.getByText('Dinner split')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });
});
