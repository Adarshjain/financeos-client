import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { DataTable } from './DataTable';
import { createDataTableColumnHelper } from './types';

interface Row {
  id: string;
  name: string;
  amount: string;
}
const helper = createDataTableColumnHelper<Row>();
const columns = helper.columns([
  helper.accessor('name', { id: 'name', header: 'Name', meta: { size: 'fill', phone: 'main' }, cell: ({ getValue }) => getValue() }),
  helper.accessor('amount', { id: 'amount', header: 'Amount', meta: { size: 'sm', align: 'end', phone: 'amount' }, cell: ({ getValue }) => getValue() }),
]);
const data: Row[] = [{ id: '1', name: 'Rent', amount: '₹36,000' }];
const table = (
  <DataTable columns={columns} data={data} getRowId={(r) => r.id} phoneSub={(r) => `Paid ₹1,000 · ${r.name}`} />
);

describe('DataTable with hidden amounts', () => {
  it('shows string cells and the phone sub line as they are', () => {
    render(table);
    expect(screen.getByText('₹36,000')).toBeInTheDocument();
    expect(screen.getByText('Paid ₹1,000 · Rent')).toBeInTheDocument();
  });

  it('replaces ₹ amounts in string cells and in the phone sub line', () => {
    render(<ConcealProvider concealed>{table}</ConcealProvider>);
    expect(screen.queryByText('₹36,000')).toBeNull();
    expect(screen.getAllByText('₹ —').length).toBeGreaterThan(0);
    expect(screen.getByText('Paid ₹ — · Rent')).toBeInTheDocument();
  });
});
