import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TypeFilterPopover } from '@/components/transactions/filter-bar/TypeFilterPopover';

describe('TypeFilterPopover', () => {
  it('shows "All Types" on the pill in the idle style when no type is picked', () => {
    render(<TypeFilterPopover activeType="ALL" onTypeChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'All Types' })).not.toHaveClass('bg-emerald-500/10');
  });

  it.each([
    ['DEBIT', 'Expenses'],
    ['CREDIT', 'Income'],
  ])('shows the picked type %s as "%s" on the pill in the active style', (type, label) => {
    render(<TypeFilterPopover activeType={type} onTypeChange={vi.fn()} />);

    // filter-active variant
    expect(screen.getByRole('button', { name: label })).toHaveClass('bg-emerald-500/10');
  });

  it('lists All Types, Expenses, Income only once opened', () => {
    render(<TypeFilterPopover activeType="ALL" onTypeChange={vi.fn()} />);
    expect(screen.queryByText('Expenses')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All Types' }));

    const options = screen
      .getAllByRole('button')
      .map((b) => b.textContent)
      .slice(1);
    expect(options).toEqual(['All Types', 'Expenses', 'Income']);
  });

  it.each([
    ['ALL', 'Expenses', 'DEBIT'],
    ['ALL', 'Income', 'CREDIT'],
    ['DEBIT', 'All Types', 'ALL'],
  ])('from %s, picking "%s" reports %s and closes the menu', (from, option, expected) => {
    const onTypeChange = vi.fn();
    render(<TypeFilterPopover activeType={from} onTypeChange={onTypeChange} />);

    const pillLabel = from === 'DEBIT' ? 'Expenses' : 'All Types';
    fireEvent.click(screen.getByRole('button', { name: pillLabel }));
    const optionButtons = screen.getAllByRole('button', { name: option });
    fireEvent.click(optionButtons[optionButtons.length - 1]);

    expect(onTypeChange).toHaveBeenCalledWith(expected);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
