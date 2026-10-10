import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);

import type { TableData } from '@/lib/reports.types';
import { formatDate, formatMoney } from '@/lib/utils';

import { TableCardList } from '../TableCardList';

const data = (over: Partial<TableData> = {}): TableData => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'description', label: 'Description', type: 'string' },
    { key: 'side', label: 'Side', type: 'enum', valueLabels: { asset: 'Asset', liability: 'Liability' } },
    { key: 'account', label: 'Account', type: 'string' },
    { key: 'amount', label: 'Amount', type: 'number', format: 'currency' },
  ],
  rows: [
    { id: 'a', date: '2026-10-01', description: 'Coffee', side: 'asset', account: 'HDFC', amount: 120 },
    { id: 'b', date: '2026-10-02', description: 'Fuel', side: 'asset', account: null, amount: 900 },
    { id: 'c', date: '2026-10-03', description: 'Card', side: 'liability', account: 'Amex', amount: 500 },
  ],
  page: { number: 0, size: 25, totalElements: 3, totalPages: 1 },
  ...over,
});

const cards = () => screen.getAllByRole('listitem');

describe('TableCardList cards', () => {
  it('shows the title, the bold value and the muted meta line of the other columns', () => {
    render(<TableCardList data={data()} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const first = cards()[0];
    expect(within(first).getByText('Coffee')).toBeInTheDocument();
    expect(within(first).getByText(formatMoney(120))).toHaveClass('font-semibold');
    expect(within(first).getByText([formatDate('2026-10-01'), 'Asset', 'HDFC'].join(' · '))).toHaveClass('text-slate-500');
    // An empty value leaves the meta line.
    expect(within(cards()[1]).getByText([formatDate('2026-10-02'), 'Asset'].join(' · '))).toBeInTheDocument();
  });

  it('uses the named value column as the figure', () => {
    render(
      <TableCardList
        data={data({
          columns: [
            { key: 'description', label: 'Description', type: 'string' },
            { key: 'qty', label: 'Qty', type: 'number' },
            { key: 'amount', label: 'Amount', type: 'number', format: 'currency' },
          ],
          rows: [{ id: 'a', description: 'INFY', qty: 7, amount: 100 }],
        })}
        valueKey="qty"
      />,
    );
    expect(within(cards()[0]).getByText('7')).toHaveClass('font-semibold');
    expect(within(cards()[0]).getByText(formatMoney(100))).toHaveClass('text-slate-500');
  });

  it('says so when there are no rows', () => {
    render(<TableCardList data={data({ rows: [] })} />);
    expect(screen.getByText('No rows for this configuration.')).toBeInTheDocument();
  });

  it('leaves cards inert without a row handler', () => {
    render(<TableCardList data={data()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('makes each card one button named by its text that hands back the row', () => {
    const onRowClick = vi.fn();
    render(<TableCardList data={data()} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Fuel/ }));
    expect(onRowClick).toHaveBeenCalledWith(data().rows[1]);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});

describe('TableCardList groups', () => {
  it('heads each run of a group with its label and total, and leaves the group column out of the cards', () => {
    render(<TableCardList data={data()} groupField="side" groupTotals={{ asset: 1020, liability: 500 }} />);
    const asset = screen.getByRole('region', { name: 'Asset' });
    expect(within(asset).getByText(formatMoney(1020))).toBeInTheDocument();
    expect(within(asset).getAllByRole('listitem')).toHaveLength(2);
    expect(within(asset).getByText([formatDate('2026-10-01'), 'HDFC'].join(' · '))).toBeInTheDocument();
    const liability = screen.getByRole('region', { name: 'Liability' });
    // The heading's total and the one card's value.
    expect(within(liability).getAllByText(formatMoney(500))).toHaveLength(2);
    expect(within(liability).getByText('Card')).toBeInTheDocument();
  });

  it('heads a group without a total by its label alone', () => {
    render(<TableCardList data={data()} groupField="side" groupTotals={{ asset: 1020 }} />);
    const liability = screen.getByRole('region', { name: 'Liability' });
    expect(within(liability).getAllByText(formatMoney(500))).toHaveLength(1);
  });

  it('draws no headings when ungrouped', () => {
    render(<TableCardList data={data()} groupTotals={{ asset: 1020 }} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});

describe('TableCardList sort', () => {
  it('offers Default order and every column, showing the default with no direction toggle', () => {
    render(<TableCardList data={data()} sort={null} onSortChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveTextContent('__default__');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Default order',
      'Date',
      'Description',
      'Side',
      'Account',
      'Amount',
    ]);
    expect(screen.queryByRole('button', { name: /Sort (a|de)scending/ })).not.toBeInTheDocument();
  });

  it('picking a column sorts ascending from the default order', () => {
    const onSortChange = vi.fn();
    render(<TableCardList data={data()} sort={null} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole('option', { name: 'Amount' }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'amount', direction: 'asc' });
  });

  it('picking another column keeps the current direction', () => {
    const onSortChange = vi.fn();
    render(<TableCardList data={data()} sort={{ key: 'amount', direction: 'desc' }} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole('option', { name: 'Date' }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'date', direction: 'desc' });
  });

  it('Default order clears the sort', () => {
    const onSortChange = vi.fn();
    render(<TableCardList data={data()} sort={{ key: 'amount', direction: 'asc' }} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole('option', { name: 'Default order' }));
    expect(onSortChange).toHaveBeenCalledWith(null);
  });

  it('the direction toggle reverses the active sort both ways', () => {
    const onSortChange = vi.fn();
    const { rerender } = render(
      <TableCardList data={data()} sort={{ key: 'amount', direction: 'asc' }} onSortChange={onSortChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'amount', direction: 'desc' });
    rerender(<TableCardList data={data()} sort={{ key: 'amount', direction: 'desc' }} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'amount', direction: 'asc' });
  });

  it('has no sort controls without a sort handler', () => {
    render(<TableCardList data={data()} />);
    expect(screen.queryByRole('combobox', { name: 'Sort' })).not.toBeInTheDocument();
  });
});

describe('TableCardList paging', () => {
  const twoPages = data({ page: { number: 0, size: 3, totalElements: 5, totalPages: 2 } });

  it('pages without a row count when asked to hide it', () => {
    const onPageChange = vi.fn();
    render(<TableCardList data={twoPages} onPageChange={onPageChange} hideRowCount />);
    expect(screen.queryByText('5 rows')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('shows no pager for a single page without the count', () => {
    render(<TableCardList data={data()} hideRowCount />);
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(screen.queryByText('3 rows')).not.toBeInTheDocument();
  });

  it('keeps the count without the option', () => {
    render(<TableCardList data={data()} />);
    expect(screen.getByText('3 rows')).toBeInTheDocument();
  });
});
