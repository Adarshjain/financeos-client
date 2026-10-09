import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PivotTableData } from '@/lib/reports.types';

import { PivotTableView } from '../PivotTableView';

// Static enum dimensions read through their valueLabels in row cells and column headers.

const data = (withLabels: boolean): PivotTableData => ({
  type: 'TABLE',
  mode: 'aggregated',
  rowDimensions: [
    {
      field: 'kind',
      label: 'Kind',
      ...(withLabels && { valueLabels: { bank_account: 'Bank account', credit_card: 'Credit card' } }),
    },
  ],
  columnDimensions: [
    { field: 'side', label: 'Side', ...(withLabels && { valueLabels: { asset: 'Asset', liability: 'Liability' } }) },
  ],
  measures: [{ key: 'amount_sum', field: 'amount', aggregation: 'sum', label: 'Amount', format: 'currency' }],
  columns: [
    { key: 'asset', values: { side: 'asset' } },
    { key: 'liability', values: { side: 'liability' } },
  ],
  rows: [
    { key: 'bank_account', values: { kind: 'bank_account' }, cells: { asset: { amount_sum: 100 } } },
    { key: 'credit_card', values: { kind: 'credit_card' }, cells: { liability: { amount_sum: 50 } } },
    { key: 'other', values: { kind: 'other_thing' }, cells: {} },
  ],
  page: { number: 0, size: 25, totalElements: 3, totalPages: 1 },
});

describe('PivotTableView valueLabels', () => {
  it('labels row dimension cells and column headers', () => {
    render(<PivotTableView data={data(true)} />);
    expect(screen.getByText('Bank account')).toBeInTheDocument();
    expect(screen.getByText('Credit card')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Asset' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Liability' })).toBeInTheDocument();
    expect(screen.queryByText('bank_account')).not.toBeInTheDocument();
  });

  it('prints a value without a label as stored', () => {
    render(<PivotTableView data={data(true)} />);
    expect(screen.getByText('other_thing')).toBeInTheDocument();
  });

  it('prints values as stored when the dimensions carry no labels', () => {
    render(<PivotTableView data={data(false)} />);
    expect(screen.getByText('bank_account')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'asset' })).toBeInTheDocument();
  });
});
