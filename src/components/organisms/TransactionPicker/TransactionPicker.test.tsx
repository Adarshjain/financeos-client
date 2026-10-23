import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionPicker, type TransactionPickerItem } from './TransactionPicker';

const items: TransactionPickerItem[] = [
  { id: 'a', title: 'Croma Electronics', subtitle: '9 Sep · HDFC Regalia ••7741', amount: '24,990.00' },
  { id: 'b', title: 'BigBasket', subtitle: '12 Oct', amount: '3,600.00' },
  { id: 'c', title: 'Swiggy', amount: '1,245.00', disabled: true, disabledReason: 'Already linked' },
];

describe('TransactionPicker', () => {
  it('selects one row by click in single mode', async () => {
    const onValueChange = vi.fn();
    render(<TransactionPicker items={items} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Croma Electronics' }));
    expect(onValueChange).toHaveBeenCalledWith('a');
    expect(screen.getByRole('radio', { name: 'Croma Electronics' })).toHaveAttribute('aria-checked', 'true');
  });

  it('does nothing on a second click of the selected row', async () => {
    const onValueChange = vi.fn();
    render(<TransactionPicker items={items} defaultValue="a" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Croma Electronics' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('toggles rows on and off in multiple mode', async () => {
    const onValueChange = vi.fn();
    render(<TransactionPicker items={items} multiple onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Croma Electronics' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'BigBasket' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b']);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Croma Electronics' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['b']);
  });

  it('typing calls onQueryChange and does not filter items', () => {
    const onQueryChange = vi.fn();
    render(<TransactionPicker items={items} onQueryChange={onQueryChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(onQueryChange).toHaveBeenCalledWith('zzz');
    expect(screen.getByText('Croma Electronics')).toBeInTheDocument();
    expect(screen.getByText('BigBasket')).toBeInTheDocument();
  });

  it('marks the query in title, subtitle and amount', () => {
    const { container, rerender } = render(<TransactionPicker items={items} query="croma" />);
    const marksOf = () => Array.from(container.querySelectorAll('mark')).map((m) => m.textContent);
    expect(marksOf()).toContain('Croma');
    rerender(<TransactionPicker items={items} query="regalia" />);
    expect(marksOf()).toEqual(['Regalia']);
    rerender(<TransactionPicker items={items} query="3600" />);
    expect(marksOf()).toEqual(['3,600']);
  });

  it('shows the Pager below the list only (never above) when there is more than one page', () => {
    const { rerender } = render(<TransactionPicker items={items} onPageChange={vi.fn()} pageSize={3} totalElements={3} />);
    expect(screen.queryByTestId('picker-pager-below')).toBeNull();
    rerender(<TransactionPicker items={items} onPageChange={vi.fn()} pageSize={3} totalElements={7} />);
    expect(screen.getByTestId('picker-pager-below')).toBeInTheDocument();
    expect(screen.queryByTestId('picker-pager-above')).toBeNull();
    expect(screen.getAllByRole('navigation', { name: 'Pagination' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('asks for the next and previous page through onPageChange', async () => {
    const onPageChange = vi.fn();
    render(<TransactionPicker items={items} page={1} pageSize={3} totalElements={9} onPageChange={onPageChange} />);
    const below = within(screen.getByTestId('picker-pager-below'));
    await userEvent.click(below.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    await userEvent.click(below.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(0);
  });

  it('shows the compact All / Debit / Credit filter only with onFilterChange, default All', async () => {
    const { rerender } = render(<TransactionPicker items={items} />);
    expect(screen.queryByTestId('picker-filter')).toBeNull();
    const onFilterChange = vi.fn();
    rerender(<TransactionPicker items={items} onFilterChange={onFilterChange} />);
    const group = screen.getByTestId('picker-filter');
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['All', 'Debit', 'Credit']);
    expect(within(group).getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: 'All' })).toHaveClass('h-control-sm');
    await userEvent.click(within(group).getByRole('radio', { name: 'Credit' }));
    expect(onFilterChange).toHaveBeenCalledWith('credit');
  });

  it('shows skeleton rows while loading with no items', () => {
    render(<TransactionPicker items={[]} loading emptyLabel="Nothing" />);
    expect(screen.getAllByTestId('picker-skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('Nothing')).toBeNull();
  });

  it('keeps items while loading another page', () => {
    render(<TransactionPicker items={items} loading />);
    expect(screen.queryAllByTestId('picker-skeleton')).toHaveLength(0);
    expect(screen.getByText('BigBasket')).toBeInTheDocument();
  });

  it('shows emptyLabel when there are no items', () => {
    render(<TransactionPicker items={[]} emptyLabel="No matching transactions" />);
    expect(screen.getByText('No matching transactions')).toBeInTheDocument();
  });

  it('does not select a disabled row and shows its reason', async () => {
    const onValueChange = vi.fn();
    render(<TransactionPicker items={items} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Swiggy' }), { pointerEventsCheck: 0 });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Already linked/)).toBeInTheDocument();
  });
});
