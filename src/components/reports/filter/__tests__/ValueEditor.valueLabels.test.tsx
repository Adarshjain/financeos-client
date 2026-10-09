import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { enumOptionsFor } from '@/components/reports/catalog';
import type { FieldDefinition } from '@/lib/reports.types';

import { ValueEditor } from '../ValueEditor';

// A static enum with server display labels: pickers show the label, filters
// keep the stored value.

const kindField = {
  name: 'kind',
  label: 'Kind',
  type: 'enum',
  role: 'dimension',
  values: ['bank_account', 'credit_card', 'loan'],
  valueLabels: { bank_account: 'Bank account', credit_card: 'Credit card' },
  allowedInReports: ['TABLE'],
} as FieldDefinition;

describe('enumOptionsFor with valueLabels', () => {
  it('names each static option by its label, keeping the stored value as id, and falls back to the value', () => {
    expect(enumOptionsFor(kindField, {})).toEqual([
      { id: 'bank_account', name: 'Bank account' },
      { id: 'credit_card', name: 'Credit card' },
      { id: 'loan', name: 'loan' },
    ]);
  });

  it('leaves dynamic fields to their fetched options', () => {
    const dynamicField = { ...kindField, dynamic: true, values: undefined } as FieldDefinition;
    expect(enumOptionsFor(dynamicField, { kind: [{ id: 'x', name: 'X' }] })).toEqual([{ id: 'x', name: 'X' }]);
  });
});

describe('ValueEditor static enum with valueLabels', () => {
  it('lists labels and stores the raw value on select', () => {
    const onChange = vi.fn();
    render(<ValueEditor kind="scalarEnum" field={kindField} dynamicOptions={{}} value={undefined} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByText('bank_account')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Credit card'));
    expect(onChange).toHaveBeenCalledWith('credit_card');
  });

  it('shows the label of a stored value', () => {
    render(<ValueEditor kind="scalarEnum" field={kindField} dynamicOptions={{}} value="bank_account" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Bank account');
  });

  it('multi-select lists labels and stores raw values', () => {
    const onChange = vi.fn();
    render(<ValueEditor kind="multi" field={kindField} dynamicOptions={{}} value={['loan']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Bank account'));
    expect(onChange).toHaveBeenCalledWith(['loan', 'bank_account']);
  });

  it('multi-select trigger shows the label of a single stored value', () => {
    render(<ValueEditor kind="multi" field={kindField} dynamicOptions={{}} value={['credit_card']} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Credit card');
  });
});
