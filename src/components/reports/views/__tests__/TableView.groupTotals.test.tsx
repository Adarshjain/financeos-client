import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TableData } from '@/lib/reports.types';
import { formatMoney } from '@/lib/utils';

import { TableView } from '../TableView';

const data = (over: Partial<TableData> = {}): TableData => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'side', label: 'Side', type: 'enum', valueLabels: { asset: 'Asset', liability: 'Liability' } },
    { key: 'value', label: 'Value', type: 'number', format: 'currency' },
  ],
  rows: [
    { id: '1', name: 'Savings', side: 'asset', value: 10000 },
    { id: '2', name: 'Broker', side: 'asset', value: 6000 },
    { id: '3', name: 'Card', side: 'liability', value: 500 },
  ],
  page: { number: 0, size: 25, totalElements: 3, totalPages: 1 },
  ...over,
});

const headerTexts = () => screen.getAllByRole('columnheader').map((h) => h.textContent);
const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('TableView hideGroupColumn', () => {
  it('leaves the group column out while grouped', () => {
    render(<TableView data={data()} groupField="side" hideGroupColumn />);
    expect(headerTexts()).toEqual(['Name', 'Value']);
    expect(within(bodyRows()[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Savings', formatMoney(10000)]);
  });

  it('shows the group column when not grouped', () => {
    render(<TableView data={data()} groupField={null} hideGroupColumn />);
    expect(headerTexts()).toEqual(['Name', 'Side', 'Value']);
  });

  it('keeps the group column without the option', () => {
    render(<TableView data={data()} groupField="side" />);
    expect(headerTexts()).toEqual(['Name', 'Side', 'Value']);
  });
});

describe('TableView group totals', () => {
  it("prints each group's total right-aligned in the total column of its header row", () => {
    render(
      <TableView
        data={data()}
        groupField="side"
        hideGroupColumn
        groupTotals={{ asset: 16000, liability: 500 }}
        groupTotalKey="value"
      />,
    );
    const rows = bodyRows();
    const asset = within(rows[0]).getAllByRole('cell');
    expect(asset.map((c) => c.textContent)).toEqual(['Asset', formatMoney(16000)]);
    // Aligned like the figures under it, which sit at the cell's start.
    expect(asset[1]).not.toHaveClass('text-right');
    expect(within(rows[3]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Liability', formatMoney(500)]);
  });

  it('pads the columns after the total column with an empty cell', () => {
    render(
      <TableView
        data={data({
          columns: [
            { key: 'name', label: 'Name', type: 'string' },
            { key: 'value', label: 'Value', type: 'number', format: 'currency' },
            { key: 'side', label: 'Side', type: 'enum' },
            { key: 'note', label: 'Note', type: 'string' },
          ],
        })}
        groupField="side"
        groupTotals={{ asset: 16000 }}
        groupTotalKey="value"
      />,
    );
    const cells = within(bodyRows()[0]).getAllByRole('cell');
    expect(cells.map((c) => c.textContent)).toEqual(['Asset', formatMoney(16000), '']);
    expect(cells[2]).toHaveAttribute('colspan', '2');
  });

  it('puts the label beside the total when the total column comes first', () => {
    render(
      <TableView
        data={data({
          columns: [
            { key: 'value', label: 'Value', type: 'number', format: 'currency' },
            { key: 'side', label: 'Side', type: 'enum', valueLabels: { asset: 'Asset' } },
          ],
        })}
        groupField="side"
        hideGroupColumn
        groupTotals={{ asset: 16000 }}
        groupTotalKey="value"
      />,
    );
    expect(within(bodyRows()[0]).getAllByRole('cell').map((c) => c.textContent)).toEqual([`Asset${formatMoney(16000)}`]);
  });

  it('falls back to the plain full-width header for a group without a total', () => {
    render(
      <TableView
        data={data()}
        groupField="side"
        hideGroupColumn
        groupTotals={{ asset: 16000 }}
        groupTotalKey="value"
      />,
    );
    const liability = within(bodyRows()[3]).getAllByRole('cell');
    expect(liability.map((c) => c.textContent)).toEqual(['Liability']);
    expect(liability[0]).toHaveAttribute('colspan', '2');
  });

  it('prints no totals when the total column is not displayed', () => {
    render(<TableView data={data()} groupField="side" groupTotals={{ asset: 16000 }} groupTotalKey="missing" />);
    expect(within(bodyRows()[0]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Asset']);
  });
});

describe('TableView hideRowCount', () => {
  const twoPages = data({ page: { number: 0, size: 3, totalElements: 5, totalPages: 2 } });

  it('drops the count but keeps paging across several pages', () => {
    render(<TableView data={twoPages} hideRowCount />);
    expect(screen.queryByText('5 rows')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
  });

  it('shows no footer at all for a single page', () => {
    render(<TableView data={data()} hideRowCount />);
    expect(screen.queryByText('3 rows')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('keeps the count without the option', () => {
    render(<TableView data={data()} />);
    expect(screen.getByText('3 rows')).toBeInTheDocument();
  });
});
