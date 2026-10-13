import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TableData } from '@/lib/reports.types';
import { formatMoney } from '@/lib/utils';

import { TableView } from '../TableView';

const data = (over: Partial<TableData> = {}): TableData => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'kind', label: 'Kind', type: 'enum', valueLabels: { bank_account: 'Bank account', broker: 'Broker' } },
    { key: 'value', label: 'Value', type: 'number', format: 'currency' },
  ],
  rows: [
    { id: 'a', name: 'Savings', kind: 'bank_account', value: 100 },
    { id: 'b', name: 'Cash', kind: null, value: 50 },
  ],
  page: { number: 0, size: 25, totalElements: 2, totalPages: 1 },
  ...over,
});

const bodyRows = () => screen.getAllByRole('row').slice(1);
const cellText = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent);

describe('TableView subtitleKey', () => {
  it('folds the column into the first cell as a muted label and drops its own column', () => {
    render(<TableView data={data()} subtitleKey="kind" />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Value']);
    expect(cellText(bodyRows()[0])).toEqual(['Savings Bank account', formatMoney(100)]);
    expect(within(bodyRows()[0]).getByText('Bank account')).toHaveClass('text-slate-500');
    expect(screen.queryByText('bank_account')).not.toBeInTheDocument();
  });

  it('prints nothing beside the title when the row has no subtitle', () => {
    render(<TableView data={data()} subtitleKey="kind" />);
    expect(cellText(bodyRows()[1])).toEqual(['Cash', formatMoney(50)]);
  });

  it('keeps the subtitle inside a clickable row\'s button', () => {
    const onRowClick = vi.fn();
    render(<TableView data={data()} subtitleKey="kind" onRowClick={onRowClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Savings Bank account' }));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('ignores a key that is not a column', () => {
    render(<TableView data={data()} subtitleKey="missing" />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Kind', 'Value']);
    expect(cellText(bodyRows()[0])).toEqual(['Savings', 'Bank account', formatMoney(100)]);
  });

  it('composes with a hidden group column', () => {
    const grouped = data({
      columns: [...data().columns, { key: 'side', label: 'Side', type: 'enum', valueLabels: { asset: 'Asset' } }],
      rows: data().rows.map((r) => ({ ...r, side: 'asset' })),
    });
    render(<TableView data={grouped} groupField="side" hideGroupColumn subtitleKey="kind" />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Value']);
    expect(cellText(bodyRows()[0])).toEqual(['Asset']);
    expect(cellText(bodyRows()[1])).toEqual(['Savings Bank account', formatMoney(100)]);
  });
});

describe('TableView hidePagination', () => {
  const twoPages = { number: 0, size: 1, totalElements: 2, totalPages: 2 };

  it('draws no pager even for a multi-page table', () => {
    render(<TableView data={data({ page: twoPages })} hidePagination onPageChange={vi.fn()} />);
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    expect(screen.queryByText(/rows/)).not.toBeInTheDocument();
  });

  it('draws no pager even when a page-size control was asked for', () => {
    render(<TableView data={data({ page: twoPages })} hidePagination hideRowCount onSizeChange={vi.fn()} />);
    expect(screen.queryByRole('combobox', { name: 'Rows per page' })).not.toBeInTheDocument();
  });

  it('still pages without it', () => {
    render(<TableView data={data({ page: twoPages })} hideRowCount onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });
});
