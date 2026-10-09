import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { nextSort, TableView } from '@/components/reports/views/TableView';
import type { TableData, TableRow } from '@/lib/reports.types';

const page = { number: 0, size: 25, totalElements: 2, totalPages: 1 };
const data = (rows: TableRow[] = [
  { id: 'a', name: 'Alpha', side: 'asset' },
  { id: 'b', name: 'Beta', side: 'asset' },
]): TableData => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'side', label: 'Side', type: 'string' },
  ],
  rows,
  page,
});

describe('nextSort', () => {
  it('starts an unsorted column at ascending', () => {
    expect(nextSort(null, 'name')).toEqual({ key: 'name', direction: 'asc' });
    expect(nextSort(undefined, 'name')).toEqual({ key: 'name', direction: 'asc' });
  });

  it('moves the active column from ascending to descending', () => {
    expect(nextSort({ key: 'name', direction: 'asc' }, 'name')).toEqual({ key: 'name', direction: 'desc' });
  });

  it('clears the sort after descending', () => {
    expect(nextSort({ key: 'name', direction: 'desc' }, 'name')).toBeNull();
  });

  it('starts a different column at ascending, replacing the active one', () => {
    expect(nextSort({ key: 'side', direction: 'desc' }, 'name')).toEqual({ key: 'name', direction: 'asc' });
  });
});

describe('TableView header sort', () => {
  it('renders plain header labels without onSortChange', () => {
    render(<TableView data={data()} />);
    const header = screen.getByRole('columnheader', { name: 'Name' });
    expect(within(header).queryByRole('button')).toBeNull();
    expect(header).not.toHaveAttribute('aria-sort');
  });

  it('makes every column header a sort button with aria-sort none when unsorted', () => {
    render(<TableView data={data()} sort={null} onSortChange={vi.fn()} />);
    for (const label of ['Name', 'Side']) {
      const header = screen.getByRole('columnheader', { name: label });
      expect(within(header).getByRole('button', { name: label })).toBeInTheDocument();
      expect(header).toHaveAttribute('aria-sort', 'none');
      expect(header.querySelector('svg')).toBeNull();
    }
  });

  it('marks only the active column ascending, with the only direction icon', () => {
    render(<TableView data={data()} sort={{ key: 'name', direction: 'asc' }} onSortChange={vi.fn()} />);
    const name = screen.getByRole('columnheader', { name: 'Name' });
    const side = screen.getByRole('columnheader', { name: 'Side' });
    expect(name).toHaveAttribute('aria-sort', 'ascending');
    expect(name.querySelector('svg.lucide-arrow-up')).not.toBeNull();
    expect(side).toHaveAttribute('aria-sort', 'none');
    expect(side.querySelector('svg')).toBeNull();
  });

  it('marks the active column descending with a down arrow', () => {
    render(<TableView data={data()} sort={{ key: 'side', direction: 'desc' }} onSortChange={vi.fn()} />);
    const side = screen.getByRole('columnheader', { name: 'Side' });
    expect(side).toHaveAttribute('aria-sort', 'descending');
    expect(side.querySelector('svg.lucide-arrow-down')).not.toBeNull();
  });

  it('cycles the clicked column asc → desc → default', () => {
    const onSortChange = vi.fn();
    const { rerender } = render(<TableView data={data()} sort={null} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'asc' });

    rerender(<TableView data={data()} sort={{ key: 'name', direction: 'asc' }} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'desc' });

    rerender(<TableView data={data()} sort={{ key: 'name', direction: 'desc' }} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenLastCalledWith(null);
  });

  it('makes the whole header cell the sort button (the cell padding moves onto it)', () => {
    render(<TableView data={data()} sort={null} onSortChange={vi.fn()} />);
    const header = screen.getByRole('columnheader', { name: 'Name' });
    expect(header).toHaveClass('p-0');
    expect(header).not.toHaveClass('px-4');
    expect(within(header).getByRole('button')).toHaveClass('w-full', 'px-4', 'py-3');
    expect(within(header).getByRole('button')).not.toHaveClass('justify-end');
  });

  it('sorts from the keyboard', async () => {
    const onSortChange = vi.fn();
    render(<TableView data={data()} sort={null} onSortChange={onSortChange} />);
    screen.getByRole('button', { name: 'Side' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onSortChange).toHaveBeenCalledWith({ key: 'side', direction: 'asc' });
  });
});

describe('TableView row click', () => {
  it('leaves rows non-interactive without onRowClick', () => {
    render(<TableView data={data()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('keeps rows as table rows and puts the row button in the first cell', () => {
    render(<TableView data={data()} onRowClick={vi.fn()} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).not.toHaveAttribute('role');
      expect(row).not.toHaveAttribute('tabindex');
      expect(row).toHaveClass('cursor-pointer');
      // The cells stay cells under their column headers.
      expect(within(row).getAllByRole('cell')).toHaveLength(2);
    }
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Alpha', 'Beta']);
    expect(buttons[0].closest('td')).toBe(within(rows[0]).getAllByRole('cell')[0]);
  });

  it('gives the row button a visible focus ring', () => {
    render(<TableView data={data()} onRowClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Alpha' });
    expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
  });

  it('hands back the row incl. its hidden id once from the row button', () => {
    const onRowClick = vi.fn();
    render(<TableView data={data()} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith({ id: 'b', name: 'Beta', side: 'asset' });
  });

  it('opens the row from a click anywhere on it', () => {
    const onRowClick = vi.fn();
    render(<TableView data={data()} onRowClick={onRowClick} />);
    fireEvent.click(screen.getAllByText('asset')[1]);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith({ id: 'b', name: 'Beta', side: 'asset' });
  });

  it('opens the row from the keyboard with Enter and Space but not other keys', async () => {
    const onRowClick = vi.fn();
    render(<TableView data={data()} onRowClick={onRowClick} />);
    screen.getByRole('button', { name: 'Alpha' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('a');
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenCalledWith({ id: 'a', name: 'Alpha', side: 'asset' });
  });

  it('renders rows sharing an id without a duplicate-key warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<TableView data={data([{ id: 'x', name: 'First', side: 'asset' }, { id: 'x', name: 'Second', side: 'asset' }])} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('TableView group headers', () => {
  const grouped = data([
    { id: '1', name: 'Bank', side: 'asset' },
    { id: '2', name: 'Broker', side: 'asset' },
    { id: '3', name: 'Card', side: 'liability' },
    { id: '4', name: 'Loan', side: 'credit_line' },
    { id: '5', name: 'Other', side: null },
  ]);
  const cells = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('tbody td[colspan]')).map((td) => td.textContent);

  it('inserts a full-width header at the first row and whenever the group value changes', () => {
    const { container } = render(<TableView data={grouped} groupField="side" />);
    expect(cells(container)).toEqual(['Asset', 'Liability', 'Credit Line', '—']);
    expect(container.querySelector('tbody td[colspan]')).toHaveAttribute('colspan', '2');
    // 5 data rows + 4 group headers.
    expect(container.querySelectorAll('tbody tr')).toHaveLength(9);
  });

  it('draws no group headers without groupField', () => {
    const { container } = render(<TableView data={grouped} groupField={null} />);
    expect(cells(container)).toEqual([]);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
  });

  it('keeps group headers out of the clickable rows', () => {
    render(<TableView data={grouped} groupField="side" onRowClick={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});

describe('TableView boolean cells', () => {
  const flags: TableData = {
    type: 'TABLE',
    mode: 'raw',
    columns: [
      { key: 'name', label: 'Name', type: 'string' },
      { key: 'excluded', label: 'Excluded', type: 'boolean' },
    ],
    rows: [
      { id: 'a', name: 'Alpha', excluded: true },
      { id: 'b', name: 'Beta', excluded: false },
      { id: 'c', name: 'Gamma', excluded: 'true' },
      { id: 'd', name: 'Delta', excluded: null },
    ],
    page: { number: 0, size: 25, totalElements: 4, totalPages: 1 },
  };

  it('reads Yes / No, and a dash when the value is missing', () => {
    render(<TableView data={flags} />);
    const cells = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[1].textContent);
    expect(cells).toEqual(['Yes', 'No', 'Yes', '—']);
  });
});
