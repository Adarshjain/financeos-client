import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionFilterBar } from '@/components/transactions/TransactionFilterBar';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import { AccountType } from '@/lib/types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Food' },
];

describe('TransactionFilterBar', () => {
  it('renders search input and triggers type segment changes', () => {
    const onFiltersChange = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <TransactionFilterBar
        accounts={mockAccounts}
        categories={mockCategories}
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

  it('toggles monitoring quick filter pill', () => {
    const onFiltersChange = vi.fn();

    render(
      <TransactionFilterBar
        accounts={mockAccounts}
        categories={mockCategories}
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

  it('handles Income, All segment buttons and active filter badges', () => {
    const onFiltersChange = vi.fn();

    const { rerender } = render(
      <TransactionFilterBar
        accounts={mockAccounts}
        categories={mockCategories}
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
        accounts={mockAccounts}
        categories={mockCategories}
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

  it('handles account and category filters', () => {
    const onFiltersChange = vi.fn();

    render(
      <TransactionFilterBar
        accounts={mockAccounts}
        categories={mockCategories}
        appliedFilters={[{ field: 'accountId', operator: 'is', value: 'acc1' }]}
        onFiltersChange={onFiltersChange}
        search=""
        onSearchChange={vi.fn()}
      />,
    );

    // Account badge is rendered
    expect(screen.getByText('Account: HDFC Savings')).toBeInTheDocument();
  });

  it('opens Date popover and selects a date preset', () => {
    const onFiltersChange = vi.fn();

    render(
      <TransactionFilterBar
        accounts={mockAccounts}
        categories={mockCategories}
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

  it('renders active date range badge and removes date filter', () => {
    const onFiltersChange = vi.fn();

    render(
      <TransactionFilterBar
        accounts={mockAccounts}
        categories={mockCategories}
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

  it('opens More Filters popover', () => {
    const onFiltersChange = vi.fn();

    render(
      <TransactionFilterBar
        accounts={mockAccounts}
        categories={mockCategories}
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
