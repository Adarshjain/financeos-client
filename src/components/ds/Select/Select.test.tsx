import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Select, SelectMenu, type SelectOption } from './Select';

const sampleOptions: SelectOption[] = [
  { value: 'hdfc', label: 'HDFC Bank', hint: '••4521' },
  { value: 'icici', label: 'ICICI Bank', hint: '••8832' },
  { value: 'sbi', label: 'State Bank of India', disabled: true, disabledReason: 'down' },
];

describe('Select', () => {
  it('renders closed single select with placeholder', () => {
    render(<Select options={sampleOptions} placeholder="Choose a bank" />);
    expect(screen.getByText('Choose a bank')).toBeInTheDocument();
  });

  it('renders selected single value and label', () => {
    render(
      <Select
        label="Bank Account"
        options={sampleOptions}
        defaultValue="hdfc"
      />,
    );
    expect(screen.getByText('Bank Account')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
  });

  it('renders multi-select chips and overflow count', () => {
    const multiOptions: SelectOption[] = [
      { value: '1', label: 'Food & dining' },
      { value: '2', label: 'Groceries' },
      { value: '3', label: 'Travel' },
      { value: '4', label: 'Bills' },
    ];
    render(
      <Select
        multiple
        options={multiOptions}
        defaultValue={['1', '2', '3', '4']}
        maxDisplayChips={2}
      />,
    );
    expect(screen.getByText('Food & dining')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders locked state with lock icon and disables interactions', () => {
    render(
      <Select
        locked
        options={sampleOptions}
        defaultValue="hdfc"
      />,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(
      <Select
        options={sampleOptions}
        error="Please choose an account"
      />,
    );
    expect(screen.getByText('Please choose an account')).toBeInTheDocument();
  });
});

describe('SelectMenu', () => {
  it('selects option on click', () => {
    const onSelect = vi.fn();
    render(<SelectMenu options={sampleOptions} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('ICICI Bank'));
    expect(onSelect).toHaveBeenCalledWith('icici');
  });

  it('does not select disabled option', () => {
    const onSelect = vi.fn();
    render(<SelectMenu options={sampleOptions} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('State Bank of India'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText('down')).toBeInTheDocument();
  });

  it('filters options when searchable', () => {
    render(<SelectMenu searchable options={sampleOptions} searchValue="HDFC" />);
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.queryByText('ICICI Bank')).not.toBeInTheDocument();
  });

  it('renders empty message when no matches found', () => {
    render(
      <SelectMenu
        searchable
        options={sampleOptions}
        searchValue="Kotak"
        emptyText={(q) => `No banks match "${q}".`}
      />,
    );
    expect(screen.getByText('No banks match "Kotak".')).toBeInTheDocument();
  });

  it('renders create action when query has no matches and onCreate is provided', () => {
    const onCreate = vi.fn();
    render(
      <SelectMenu
        searchable
        options={sampleOptions}
        searchValue="Axis"
        onCreate={onCreate}
        createLabel={(q) => `+ Add "${q}"`}
      />,
    );
    const createBtn = screen.getByText('+ Add "Axis"');
    expect(createBtn).toBeInTheDocument();
    fireEvent.click(createBtn);
    expect(onCreate).toHaveBeenCalledWith('Axis');
  });

  it('renders multi-select footer with Clear and Done buttons', () => {
    const onClear = vi.fn();
    const onDone = vi.fn();
    render(
      <SelectMenu
        multiple
        options={sampleOptions}
        value={['hdfc']}
        onClear={onClear}
        onDone={onDone}
      />,
    );
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    const doneBtn = screen.getByRole('button', { name: 'Done · 1' });

    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);

    fireEvent.click(doneBtn);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('renders section groups with uppercase headers', () => {
    const groups = [
      { name: 'Bank accounts', options: [{ value: '1', label: 'HDFC Savings' }] },
      { name: 'Credit cards', options: [{ value: '2', label: 'Regalia Gold' }] },
    ];
    render(<SelectMenu groups={groups} />);
    expect(screen.getByText('Bank accounts')).toBeInTheDocument();
    expect(screen.getByText('Credit cards')).toBeInTheDocument();
  });
});
