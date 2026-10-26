import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DynamicOptions } from '@/features/reports/builder/catalog';
import { FilterValueEditor } from '@/features/reports/builder/FilterValueEditor';
import type { FieldDefinition } from '@/lib/reports.types';

import { ValueEditor } from '../ValueEditor';

const field = { name: 'account', label: 'Account', type: 'enum', role: 'dimension', dynamic: true, idField: 'accountId', allowedInReports: [] } as FieldDefinition;
const loaded = { account: [{ id: 'a1', name: 'HDFC' }] } as DynamicOptions;
const UUID = '3f2c1a9e-0b1d-4c55-9a1e-123456789abc';

describe('Legacy ValueEditor stale dynamic value', () => {
  it('single: keeps a stale name selected and visible', () => {
    render(<ValueEditor kind="scalarEnum" field={field} dynamicOptions={loaded} value="Old bank" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Old bank (not found)');
  });

  it('single: a uuid reads as removed, and picking a real option replaces it', () => {
    const onChange = vi.fn();
    render(<ValueEditor kind="scalarEnum" field={field} dynamicOptions={loaded} value={UUID} onChange={onChange} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Unknown account');
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('HDFC'));
    expect(onChange).toHaveBeenCalledWith('a1');
  });

  it('single: no stale label while options load', () => {
    render(<ValueEditor kind="scalarEnum" field={field} dynamicOptions={{} as DynamicOptions} value="Old bank" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).not.toHaveTextContent('not found');
  });

  it('multi: shows the stale value among the selection', () => {
    render(<ValueEditor kind="multi" field={field} dynamicOptions={loaded} value={['a1', 'Old bank']} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Old bank (not found)')).toBeInTheDocument();
  });

  it('single: a stored option name is valid and shows as itself', () => {
    render(<ValueEditor kind="scalarEnum" field={field} dynamicOptions={loaded} value="HDFC" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('HDFC');
    expect(screen.getByRole('combobox')).not.toHaveTextContent('not found');
  });

  it('multi: a stored option name is valid and shows as itself', () => {
    render(<ValueEditor kind="multi" field={field} dynamicOptions={loaded} value={['HDFC', 'Old bank']} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Old bank (not found)')).toBeInTheDocument();
    expect(screen.queryByText('HDFC (not found)')).not.toBeInTheDocument();
    expect(screen.getAllByText('HDFC').length).toBeGreaterThan(0);
  });
});

describe('Dinero FilterValueEditor stale dynamic value', () => {
  it('single: keeps a stale name selected and visible', () => {
    render(<FilterValueEditor kind="scalarEnum" field={field} dynamicOptions={loaded} value="Old bank" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Old bank (not found)');
  });

  it('single: a uuid reads as removed', () => {
    render(<FilterValueEditor kind="scalarEnum" field={field} dynamicOptions={loaded} value={UUID} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Unknown account');
  });

  it('single: no stale label while options load', () => {
    render(<FilterValueEditor kind="scalarEnum" field={field} dynamicOptions={{} as DynamicOptions} value="Old bank" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).not.toHaveTextContent('not found');
  });

  it('multi: shows the stale value among the selection', () => {
    render(<FilterValueEditor kind="multi" field={field} dynamicOptions={loaded} value={['a1', 'Old bank']} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Old bank (not found)');
  });

  it('single: a stored option name is valid and shows as itself', () => {
    render(<FilterValueEditor kind="scalarEnum" field={field} dynamicOptions={loaded} value="HDFC" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('HDFC');
    expect(screen.getByRole('combobox')).not.toHaveTextContent('not found');
  });

  it('multi: a stored option name is valid and shows as itself', () => {
    render(<FilterValueEditor kind="multi" field={field} dynamicOptions={loaded} value={['HDFC', 'Old bank']} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Old bank (not found)');
    expect(screen.getByRole('combobox')).not.toHaveTextContent('HDFC (not found)');
  });
});
