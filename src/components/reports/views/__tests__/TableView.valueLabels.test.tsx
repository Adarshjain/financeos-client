import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TableData } from '@/lib/reports.types';

import { TableView } from '../TableView';

// Static enum columns read through the server's valueLabels; rows keep the stored values.

const data = (over: Partial<TableData> = {}): TableData => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'name', label: 'Name', type: 'string' },
    {
      key: 'kind',
      label: 'Kind',
      type: 'enum',
      valueLabels: { bank_account: 'Bank account', credit_card: 'Credit card' },
    },
    { key: 'side', label: 'Side', type: 'enum', valueLabels: { asset: 'Asset', liability: 'Liability' } },
  ],
  rows: [
    { id: '1', name: 'HDFC', kind: 'bank_account', side: 'asset' },
    { id: '2', name: 'Axis', kind: 'credit_card', side: 'liability' },
    { id: '3', name: 'Gold', kind: 'physical_gold', side: 'asset' },
  ],
  page: { number: 0, size: 25, totalElements: 3, totalPages: 1 },
  ...over,
});

describe('TableView valueLabels', () => {
  it('prints each enum cell as its label', () => {
    render(<TableView data={data()} />);
    expect(screen.getByText('Bank account')).toBeInTheDocument();
    expect(screen.getByText('Credit card')).toBeInTheDocument();
    expect(screen.getByText('Liability')).toBeInTheDocument();
    expect(screen.queryByText('bank_account')).not.toBeInTheDocument();
  });

  it('prints a value without a label as stored', () => {
    render(<TableView data={data()} />);
    expect(screen.getByText('physical_gold')).toBeInTheDocument();
  });

  it('prints a column without valueLabels as stored', () => {
    render(
      <TableView
        data={data({
          columns: [{ key: 'kind', label: 'Kind', type: 'enum' }],
          rows: [{ id: '1', kind: 'bank_account' }],
        })}
      />,
    );
    expect(screen.getByText('bank_account')).toBeInTheDocument();
  });

  it('heads groups with the group column label', () => {
    render(<TableView data={data()} groupField="side" />);
    const groupCells = screen.getAllByRole('cell').filter((c) => c.getAttribute('colspan') === '3');
    expect(groupCells.map((c) => c.textContent)).toEqual(['Asset', 'Liability', 'Asset']);
  });

  it('falls back to title-casing a group value without a label', () => {
    render(
      <TableView
        data={data({
          columns: [
            { key: 'name', label: 'Name', type: 'string' },
            { key: 'side', label: 'Side', type: 'enum' },
          ],
          rows: [{ id: '1', name: 'HDFC', side: 'credit_card' }],
        })}
        groupField="side"
      />,
    );
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
  });
});
