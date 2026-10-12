import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionFilterBar } from '@/components/transactions/TransactionFilterBar';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { FilterClause } from '@/lib/reports.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

// Deliberately out of type order to prove grouping re-orders them.
const mockAccounts = [
  { id: 'cc1', name: 'HDFC Regalia', type: AccountType.CREDIT_CARD },
  { id: 'bank1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
  { id: 'gen1', name: 'Cash Wallet', type: AccountType.GENERIC },
  { id: 'bank2', name: 'ICICI Salary', type: AccountType.BANK_ACCOUNT, closedOn: '2026-01-01' },
  { id: 'brk1', name: 'Zerodha', type: AccountType.BROKER },
] as Account[];

const SELECTABLE_IDS = ['cc1', 'bank1', 'gen1', 'bank2'];

function renderBar(appliedFilters: FilterClause[] = []) {
  const onFiltersChange = vi.fn();
  renderWithQuery(
    <TransactionFilterBar
      appliedFilters={appliedFilters}
      onFiltersChange={onFiltersChange}
      search=""
      onSearchChange={vi.fn()}
    />,
  );
  return onFiltersChange;
}

async function openAccounts(pillName: string | RegExp = 'Account') {
  // Pill label resolves once accounts load.
  const pill = await screen.findByRole('button', { name: pillName });
  fireEvent.click(pill);
  return screen.findByRole('listbox');
}

describe('AccountMultiSelect (transactions page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.GET as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/v1/accounts') return Promise.resolve({ data: mockAccounts });
      if (url === '/api/v1/categories') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: null });
    });
  });

  it('groups accounts under title-cased type headings in type order, without the raw type tag', async () => {
    renderBar();
    const list = await openAccounts();
    await within(list).findByText('HDFC Savings');

    const headings = Array.from(list.querySelectorAll('[cmdk-group-heading]')).map((h) => h.textContent);
    expect(headings).toEqual(['Bank Account', 'Credit Card', 'Generic']);

    const bankGroup = within(list).getByText('Bank Account').closest('[cmdk-group]') as HTMLElement;
    expect(within(bankGroup).getByText('HDFC Savings')).toBeInTheDocument();
    expect(within(bankGroup).getByText('ICICI Salary')).toBeInTheDocument();
    expect(within(bankGroup).getByText('(Closed)')).toBeInTheDocument();

    expect(within(list).queryByText(/bank_account|credit_card/i)).not.toBeInTheDocument();
    // Broker stays hidden unless already filtered on.
    expect(within(list).queryByText('Zerodha')).not.toBeInTheDocument();
  });

  it('shows an active broker under a Broker heading', async () => {
    renderBar([{ field: 'accountId', operator: 'is', value: 'brk1' }]);
    const list = await openAccounts('Zerodha');
    await within(list).findByText('HDFC Savings');

    const headings = Array.from(list.querySelectorAll('[cmdk-group-heading]')).map((h) => h.textContent);
    expect(headings).toEqual(['Bank Account', 'Credit Card', 'Broker', 'Generic']);
  });

  it('Select all with nothing selected filters on every selectable account', async () => {
    const onFiltersChange = renderBar();
    const list = await openAccounts();
    const selectAll = await within(list).findByRole('option', { name: 'Select all' });
    expect(within(selectAll).getByRole('checkbox')).toHaveAttribute('data-state', 'unchecked');

    fireEvent.click(selectAll);

    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'accountId', operator: 'in', value: SELECTABLE_IDS },
    ]);
  });

  it('Select all with some selected shows indeterminate and selects every account', async () => {
    const onFiltersChange = renderBar([{ field: 'accountId', operator: 'is', value: 'bank1' }]);
    const list = await openAccounts('HDFC Savings');
    const selectAll = await within(list).findByRole('option', { name: 'Select all' });
    expect(within(selectAll).getByRole('checkbox')).toHaveAttribute('data-state', 'indeterminate');

    fireEvent.click(selectAll);

    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'accountId', operator: 'in', value: SELECTABLE_IDS },
    ]);
  });

  it('Deselect all with every account selected clears the account filter', async () => {
    const onFiltersChange = renderBar([
      { field: 'type', operator: 'is', value: 'DEBIT' },
      { field: 'accountId', operator: 'in', value: SELECTABLE_IDS },
    ]);
    const list = await openAccounts('Accounts (4)');
    const deselectAll = await within(list).findByRole('option', { name: 'Deselect all' });
    expect(within(deselectAll).getByRole('checkbox')).toHaveAttribute('data-state', 'checked');

    fireEvent.click(deselectAll);

    expect(onFiltersChange).toHaveBeenCalledWith([{ field: 'type', operator: 'is', value: 'DEBIT' }]);
  });

  it('hides Select all while searching and still filters accounts by name', async () => {
    renderBar();
    const list = await openAccounts();
    await within(list).findByRole('option', { name: 'Select all' });

    fireEvent.change(screen.getByPlaceholderText('Search accounts...'), { target: { value: 'regalia' } });

    await waitFor(() => {
      expect(within(list).queryByRole('option', { name: 'Select all' })).not.toBeInTheDocument();
    });
    expect(within(list).getByText('HDFC Regalia')).toBeInTheDocument();
    expect(within(list).queryByText('HDFC Savings')).not.toBeInTheDocument();
  });

  it('toggling a single account still adds it to the filter', async () => {
    const onFiltersChange = renderBar([{ field: 'accountId', operator: 'is', value: 'bank1' }]);
    const list = await openAccounts('HDFC Savings');

    fireEvent.click(await within(list).findByRole('option', { name: /HDFC Regalia/ }));

    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'accountId', operator: 'in', value: ['bank1', 'cc1'] },
    ]);
  });
});
