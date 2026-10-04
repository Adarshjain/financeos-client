import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionFilterBar } from '@/components/transactions/TransactionFilterBar';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { Category } from '@/lib/categories.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

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

function mockApiGet() {
  (api.GET as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === '/api/v1/accounts') return Promise.resolve({ data: mockAccounts });
    if (url === '/api/v1/categories') return Promise.resolve({ data: mockCategories });
    return Promise.resolve({ data: null });
  });
}

describe('TransactionFilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
  });

  it('renders search input and triggers type segment changes', async () => {
    const onFiltersChange = vi.fn();
    const onSearchChange = vi.fn();

    renderWithQuery(
      <TransactionFilterBar
        appliedFilters={[]}
        onFiltersChange={onFiltersChange}
        search=""
        onSearchChange={onSearchChange}
      />,
    );

    // Search input
    const searchInput = screen.getByPlaceholderText(/Search descriptions/i);
    fireEvent.change(searchInput, { target: { value: 'coffee' } });
    expect(onSearchChange).toHaveBeenCalledWith('coffee');

    // Type segment buttons
    const expensesBtn = screen.getByRole('button', { name: 'Expenses' });
    fireEvent.click(expensesBtn);
    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'type', operator: 'is', value: 'DEBIT' },
    ]);
  });

  it('toggles monitoring quick filter pill', async () => {
    const onFiltersChange = vi.fn();

    renderWithQuery(
      <TransactionFilterBar
        appliedFilters={[]}
        onFiltersChange={onFiltersChange}
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    const monitoringBtn = screen.getByRole('button', { name: /Monitoring/i });
    fireEvent.click(monitoringBtn);

    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'isUnderMonitoring', operator: 'is', value: true },
    ]);
  });

  it('handles Income, All segment buttons and active filter badges', async () => {
    const onFiltersChange = vi.fn();

    const { rerender } = renderWithQuery(
      <TransactionFilterBar
        appliedFilters={[{ field: 'type', operator: 'is', value: 'DEBIT' }]}
        onFiltersChange={onFiltersChange}
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    // Income button
    const incomeBtn = screen.getByRole('button', { name: 'Income' });
    fireEvent.click(incomeBtn);
    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'type', operator: 'is', value: 'CREDIT' },
    ]);

    // All button clears type filter
    const allBtn = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allBtn);
    expect(onFiltersChange).toHaveBeenCalledWith([]);

    // Rerender with active filters to test badges and Clear all button
    rerender(
      <TransactionFilterBar
        appliedFilters={[
          { field: 'type', operator: 'is', value: 'DEBIT' },
          { field: 'isExcluded', operator: 'is', value: true },
        ]}
        onFiltersChange={onFiltersChange}
        search="active search"
        onSearchChange={vi.fn()}
      />,
    );

    const clearAllBtn = screen.getByRole('button', { name: 'Clear all' });
    fireEvent.click(clearAllBtn);
    expect(onFiltersChange).toHaveBeenCalledWith([]);
  });

  it('handles account and category filters', async () => {
    const onFiltersChange = vi.fn();

    renderWithQuery(
      <TransactionFilterBar
        appliedFilters={[{ field: 'accountId', operator: 'is', value: 'acc1' }]}
        onFiltersChange={onFiltersChange}
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    // Account badge is rendered
    await waitFor(() => {
      expect(screen.getByText('Account: HDFC Savings')).toBeInTheDocument();
    });
  });

  it('opens Date popover and selects a date preset', async () => {
    const onFiltersChange = vi.fn();

    renderWithQuery(
      <TransactionFilterBar
        appliedFilters={[]}
        onFiltersChange={onFiltersChange}
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    const dateTrigger = screen.getByRole('button', { name: /All Time/i });
    fireEvent.click(dateTrigger);

    const thisMonthOption = screen.getByText('This Month');
    fireEvent.click(thisMonthOption);

    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'date', operator: 'this_month' },
    ]);
  });

  it('renders active date range badge and removes date filter', async () => {
    const onFiltersChange = vi.fn();

    renderWithQuery(
      <TransactionFilterBar
        appliedFilters={[{ field: 'date', operator: 'this_month' }]}
        onFiltersChange={onFiltersChange}
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    const removeBtn = screen.getByText('Date: This Month');
    fireEvent.click(removeBtn);

    expect(onFiltersChange).toHaveBeenCalledWith([]);
  });

  it('applies a single custom date as an `is` clause', async () => {
    const onFiltersChange = vi.fn();
    renderWithQuery(
      <TransactionFilterBar appliedFilters={[]} onFiltersChange={onFiltersChange} search="" onSearchChange={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /All Time/i }));
    expect(screen.getByRole('radio', { name: 'Single Date' })).toHaveAttribute('aria-checked', 'true');
    const apply = screen.getByRole('button', { name: 'Apply Date' });
    expect(apply).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '15/08/2026' } });
    fireEvent.click(apply);

    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'date', operator: 'is', value: '2026-08-15' },
    ]);
  });

  it('applies a custom range as a `between` clause and blocks an inverted range', async () => {
    const onFiltersChange = vi.fn();
    renderWithQuery(
      <TransactionFilterBar appliedFilters={[]} onFiltersChange={onFiltersChange} search="" onSearchChange={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /All Time/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'Range' }));
    const apply = screen.getByRole('button', { name: 'Apply Range' });

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '20/08/2026' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '10/08/2026' } });
    expect(apply).toBeDisabled();

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '31/08/2026' } });
    fireEvent.click(apply);

    expect(onFiltersChange).toHaveBeenCalledWith([
      { field: 'date', operator: 'between', value: { from: '2026-08-20', to: '2026-08-31' } },
    ]);
  });

  it('labels an applied single date in dd/mm/yyyy and reopens on it', async () => {
    renderWithQuery(
      <TransactionFilterBar
        appliedFilters={[{ field: 'date', operator: 'is', value: '2026-08-15' }]}
        onFiltersChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Date: 15/08/2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^15\/08\/2026/ }));
    expect(screen.getByRole('radio', { name: 'Single Date' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Date')).toHaveValue('15/08/2026');
  });

  it('labels an applied range in dd/mm/yyyy and reopens in range mode', async () => {
    renderWithQuery(
      <TransactionFilterBar
        appliedFilters={[{ field: 'date', operator: 'between', value: { from: '2026-08-01', to: '2026-08-31' } }]}
        onFiltersChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Date: 01/08/2026 - 31/08/2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /01\/08\/2026 to 31\/08\/2026/ }));
    expect(screen.getByRole('radio', { name: 'Range' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('From')).toHaveValue('01/08/2026');
    expect(screen.getByLabelText('To')).toHaveValue('31/08/2026');
  });

  it('opens More Filters popover', async () => {
    const onFiltersChange = vi.fn();

    renderWithQuery(
      <TransactionFilterBar
        appliedFilters={[{ field: 'source', operator: 'is', value: 'manual' }]}
        onFiltersChange={onFiltersChange}
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    const filtersBtn = screen.getByRole('button', { name: /More/i });
    fireEvent.click(filtersBtn);

    expect(screen.getByText('Additional Filters')).toBeInTheDocument();
  });
});
