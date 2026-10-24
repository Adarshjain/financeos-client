import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable';
import { createDataTableColumnHelper } from './types';

interface Row { id: string; name: string }
const helper = createDataTableColumnHelper<Row>();
const columns = helper.columns([
  helper.accessor('name', { id: 'name', header: 'Name', meta: { size: 'fill', grow: 2, phone: 'main' }, cell: ({ getValue }) => getValue() }),
]);

describe('DataTable renderRow press point', () => {
  it('forwards the press point from rowProps.onSelect to onRowSelect', () => {
    const onRowSelect = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={[{ id: '1', name: 'Rent' }]}
        getRowId={(r) => r.id}
        onRowSelect={onRowSelect}
        renderRow={(row, rowProps) => (
          <button type="button" onClick={() => rowProps.onSelect({ x: 11, y: 22 })}>{row.name}</button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rent' }));
    expect(onRowSelect).toHaveBeenCalledWith({ id: '1', name: 'Rent' }, { x: 11, y: 22 });
  });

  it('rowProps.onSelect without a point still calls onRowSelect', () => {
    const onRowSelect = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={[{ id: '1', name: 'Rent' }]}
        getRowId={(r) => r.id}
        onRowSelect={onRowSelect}
        renderRow={(row, rowProps) => <button type="button" onClick={() => rowProps.onSelect()}>{row.name}</button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rent' }));
    expect(onRowSelect).toHaveBeenCalledWith({ id: '1', name: 'Rent' }, undefined);
  });

  it('the eye button of a keyboard activation anchors at its bottom-left', () => {
    const onRowSelect = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={[{ id: '1', name: 'Rent' }]}
        getRowId={(r) => r.id}
        selectable
        selection={['1']}
        onRowSelect={onRowSelect}
      />,
    );
    const eye = screen.getAllByRole('button', { name: 'Open' })[0];
    eye.getBoundingClientRect = () => ({ left: 30, bottom: 70, top: 40, right: 60, width: 30, height: 30, x: 30, y: 40, toJSON: () => ({}) });
    fireEvent.click(eye, { detail: 0, clientX: 0, clientY: 0 });
    expect(onRowSelect).toHaveBeenCalledWith({ id: '1', name: 'Rent' }, { x: 30, y: 70 });
  });
});
