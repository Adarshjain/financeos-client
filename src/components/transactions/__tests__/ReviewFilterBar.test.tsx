import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewFilterBar } from '@/components/transactions/ReviewFilterBar';
import type { Account } from '@/lib/account.types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Bank', type: 'bank_account', lastStatementDate: '2026-06-30' },
  { id: 'acc2', name: 'ICICI Card', type: 'credit_card', lastStatementDate: null },
];

describe('ReviewFilterBar (CD-1, CD-5)', () => {
  it('renders search input, reason options, account button, and statement cutoff button', () => {
    render(
      <ReviewFilterBar
        accounts={mockAccounts}
        appliedAccountIds={['acc1', 'acc2']}
        onAccountIdsChange={vi.fn()}
        onlyUpToLastStatement={true}
        onOnlyUpToLastStatementChange={vi.fn()}
        activeReasonFilter="ALL"
        onReasonFilterChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        sortBy="date,desc"
        onSortByChange={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('Search by description...')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Up to Statement')).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
  });

  it('triggers search change on input', () => {
    const onSearchChange = vi.fn();
    render(
      <ReviewFilterBar
        accounts={mockAccounts}
        appliedAccountIds={['acc1', 'acc2']}
        onAccountIdsChange={vi.fn()}
        onlyUpToLastStatement={true}
        onOnlyUpToLastStatementChange={vi.fn()}
        activeReasonFilter="ALL"
        onReasonFilterChange={vi.fn()}
        search="Test"
        onSearchChange={onSearchChange}
        sortBy="date,desc"
        onSortByChange={vi.fn()}
      />,
    );

    const clearBtn = screen.getAllByLabelText('Clear search')[0];
    fireEvent.click(clearBtn);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('toggles statement cutoff filter', () => {
    const onOnlyUpToLastStatementChange = vi.fn();
    render(
      <ReviewFilterBar
        accounts={mockAccounts}
        appliedAccountIds={['acc1', 'acc2']}
        onAccountIdsChange={vi.fn()}
        onlyUpToLastStatement={true}
        onOnlyUpToLastStatementChange={onOnlyUpToLastStatementChange}
        activeReasonFilter="ALL"
        onReasonFilterChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        sortBy="date,desc"
        onSortByChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Up to Statement'));
    expect(onOnlyUpToLastStatementChange).toHaveBeenCalledWith(false);
  });

  it('switches active reason filter', () => {
    const onReasonFilterChange = vi.fn();
    render(
      <ReviewFilterBar
        accounts={mockAccounts}
        appliedAccountIds={['acc1', 'acc2']}
        onAccountIdsChange={vi.fn()}
        onlyUpToLastStatement={true}
        onOnlyUpToLastStatementChange={vi.fn()}
        activeReasonFilter="ALL"
        onReasonFilterChange={onReasonFilterChange}
        search=""
        onSearchChange={vi.fn()}
        sortBy="date,desc"
        onSortByChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Unreconciled'));
    expect(onReasonFilterChange).toHaveBeenCalledWith('UNRECONCILED');
  });

  it('resets all filters when clear all is clicked', () => {
    const onAccountIdsChange = vi.fn();
    const onOnlyUpToLastStatementChange = vi.fn();
    const onReasonFilterChange = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <ReviewFilterBar
        accounts={mockAccounts}
        appliedAccountIds={['acc1']}
        onAccountIdsChange={onAccountIdsChange}
        onlyUpToLastStatement={false}
        onOnlyUpToLastStatementChange={onOnlyUpToLastStatementChange}
        activeReasonFilter="UNRECONCILED"
        onReasonFilterChange={onReasonFilterChange}
        search="active search"
        onSearchChange={onSearchChange}
        sortBy="date,desc"
        onSortByChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Clear all'));
    expect(onAccountIdsChange).toHaveBeenCalledWith(['acc1', 'acc2']);
    expect(onOnlyUpToLastStatementChange).toHaveBeenCalledWith(true);
    expect(onReasonFilterChange).toHaveBeenCalledWith('ALL');
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('renders active account badge when only one account is selected', () => {
    render(
      <ReviewFilterBar
        accounts={mockAccounts}
        appliedAccountIds={['acc1']}
        onAccountIdsChange={vi.fn()}
        onlyUpToLastStatement={true}
        onOnlyUpToLastStatementChange={vi.fn()}
        activeReasonFilter="ALL"
        onReasonFilterChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        sortBy="date,desc"
        onSortByChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Accounts: HDFC Bank')).toBeInTheDocument();
  });

  it('removes reason filter badge when badge remove button is clicked', () => {
    const onReasonFilterChange = vi.fn();

    render(
      <ReviewFilterBar
        accounts={mockAccounts}
        appliedAccountIds={['acc1', 'acc2']}
        onAccountIdsChange={vi.fn()}
        onlyUpToLastStatement={true}
        onOnlyUpToLastStatementChange={vi.fn()}
        activeReasonFilter="UNRECONCILED"
        onReasonFilterChange={onReasonFilterChange}
        search=""
        onSearchChange={vi.fn()}
        sortBy="date,desc"
        onSortByChange={vi.fn()}
      />,
    );

    const removeBtn = screen.getByText('Reason: Unreconciled');
    fireEvent.click(removeBtn);
    expect(onReasonFilterChange).toHaveBeenCalledWith('ALL');
  });

  it('selects sort option in sort popover', () => {
    const onSortByChange = vi.fn();

    render(
      <ReviewFilterBar
        accounts={mockAccounts}
        appliedAccountIds={['acc1', 'acc2']}
        onAccountIdsChange={vi.fn()}
        onlyUpToLastStatement={true}
        onOnlyUpToLastStatementChange={vi.fn()}
        activeReasonFilter="ALL"
        onReasonFilterChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        sortBy="date,desc"
        onSortByChange={onSortByChange}
      />,
    );

    const sortTrigger = screen.getByText('Newest First');
    fireEvent.click(sortTrigger);

    const oldestOption = screen.getByText('Oldest First');
    fireEvent.click(oldestOption);
    expect(onSortByChange).toHaveBeenCalledWith('date,asc');
  });
});
