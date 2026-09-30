import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FieldDefinition } from '@/lib/reports.types';

import { ValueEditor } from '../ValueEditor';

const ruleField = {
  name: 'rule',
  label: 'Rule',
  type: 'enum',
  role: 'dimension',
  dynamic: true,
  allowedInReports: ['CHART'],
} as FieldDefinition;

const reasonField = {
  name: 'reason',
  label: 'Reason',
  type: 'enum',
  role: 'dimension',
  values: ['MATCHED', 'NO_RULE'],
  allowedInReports: ['CHART'],
} as FieldDefinition;

describe('ValueEditor dynamic enum values', () => {
  it('shows a loading hint while the dynamic field has no loaded values', () => {
    render(<ValueEditor kind="scalarEnum" field={ruleField} dynamicOptions={{}} value={undefined} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Loading values…')).toBeInTheDocument();
  });

  it('says there are no values once the field loaded empty', () => {
    render(<ValueEditor kind="scalarEnum" field={ruleField} dynamicOptions={{ rule: [] }} value={undefined} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('No values in your data yet')).toBeInTheDocument();
  });

  it('lists the loaded values and emits the raw value on select', () => {
    const onChange = vi.fn();
    render(
      <ValueEditor
        kind="scalarEnum"
        field={ruleField}
        dynamicOptions={{ rule: [{ id: 'Base 1%', name: 'Base 1%' }, { id: 'Weekend bonus', name: 'Weekend bonus' }] }}
        value={undefined}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByText('Loading values…')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Weekend bonus'));
    expect(onChange).toHaveBeenCalledWith('Weekend bonus');
  });

  it('never shows the hint for a static enum', () => {
    render(<ValueEditor kind="scalarEnum" field={reasonField} dynamicOptions={{}} value={undefined} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByText('Loading values…')).not.toBeInTheDocument();
    expect(screen.getByText('NO_RULE')).toBeInTheDocument();
  });

  it('uses the hint as the multi-select placeholder while loading and when empty', () => {
    const { rerender } = render(
      <ValueEditor kind="multi" field={ruleField} dynamicOptions={{}} value={[]} onChange={vi.fn()} />,
    );
    expect(screen.getByText('Loading values…')).toBeInTheDocument();
    rerender(<ValueEditor kind="multi" field={ruleField} dynamicOptions={{ rule: [] }} value={[]} onChange={vi.fn()} />);
    expect(screen.getByText('No values in your data yet')).toBeInTheDocument();
    rerender(
      <ValueEditor
        kind="multi"
        field={ruleField}
        dynamicOptions={{ rule: [{ id: 'Base 1%', name: 'Base 1%' }] }}
        value={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Select values…')).toBeInTheDocument();
  });
});
