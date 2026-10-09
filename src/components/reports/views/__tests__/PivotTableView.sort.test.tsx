import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PivotTableView } from '@/components/reports/views/PivotTableView';
import type { PivotTableData } from '@/lib/reports.types';

const page = { number: 0, size: 25, totalElements: 1, totalPages: 1 };
const amount = { key: 'amount_sum', field: 'amount', aggregation: 'sum', label: 'Total amount' };
const count = { key: 'id_count', field: 'id', aggregation: 'count', label: 'Count' };

const flat: PivotTableData = {
  type: 'TABLE',
  mode: 'aggregated',
  rowDimensions: [{ field: 'category', label: 'Category' }],
  columnDimensions: [],
  measures: [amount],
  columns: [{ key: '', values: {} }],
  rows: [{ key: 'r1', values: { category: 'Food' }, cells: { '': { amount_sum: 10 } } }],
  page,
};

const crossTab: PivotTableData = {
  ...flat,
  columnDimensions: [{ field: 'month', label: 'Month' }],
  measures: [amount, count],
  columns: [{ key: 'sep', values: { month: 'Sep' } }],
  rows: [{ key: 'r1', values: { category: 'Food' }, cells: { sep: { amount_sum: 10, id_count: 1 } } }],
};

describe('PivotTableView header sort', () => {
  it('renders plain headers without onSortChange', () => {
    render(<PivotTableView data={flat} />);
    expect(screen.queryAllByRole('button', { name: /category|total amount/i })).toHaveLength(0);
    expect(screen.getByRole('columnheader', { name: 'Category' })).not.toHaveAttribute('aria-sort');
  });

  it('sorts row dimensions by field and measures by measure key when there are no column dims', () => {
    const onSortChange = vi.fn();
    render(<PivotTableView data={flat} sort={null} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Category' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'category', direction: 'asc' });
    fireEvent.click(screen.getByRole('button', { name: 'Total amount' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'amount_sum', direction: 'asc' });
  });

  it('marks the active measure header and cycles it to descending', () => {
    const onSortChange = vi.fn();
    render(<PivotTableView data={flat} sort={{ key: 'amount_sum', direction: 'asc' }} onSortChange={onSortChange} />);
    const header = screen.getByRole('columnheader', { name: 'Total amount' });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: 'Category' })).toHaveAttribute('aria-sort', 'none');
    fireEvent.click(within(header).getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'amount_sum', direction: 'desc' });
  });

  it('makes whole header cells the sort buttons, measure labels right-aligned', () => {
    render(<PivotTableView data={flat} sort={null} onSortChange={vi.fn()} />);
    const category = screen.getByRole('columnheader', { name: 'Category' });
    const measure = screen.getByRole('columnheader', { name: 'Total amount' });
    for (const header of [category, measure]) {
      expect(header).toHaveClass('p-0');
      expect(within(header).getByRole('button')).toHaveClass('w-full', 'px-4', 'py-3');
    }
    expect(within(category).getByRole('button')).not.toHaveClass('justify-end');
    expect(within(measure).getByRole('button')).toHaveClass('justify-end');
  });

  it('keeps row dimensions sortable but not column or measure headers when there are column dims', () => {
    render(<PivotTableView data={crossTab} sort={{ key: 'category', direction: 'desc' }} onSortChange={vi.fn()} />);
    const category = screen.getByRole('columnheader', { name: 'Category' });
    expect(category).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getAllByRole('button', { name: /^(category)$/i })).toHaveLength(1);
    for (const label of ['Sep', 'Total amount', 'Count']) {
      const header = screen.getByRole('columnheader', { name: label });
      expect(within(header).queryByRole('button')).toBeNull();
      expect(header).not.toHaveAttribute('aria-sort');
    }
  });
});
