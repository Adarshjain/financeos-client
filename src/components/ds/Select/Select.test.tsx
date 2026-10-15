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

  it('renders disabled state and disables interactions', () => {
    render(
      <Select
        disabled
        options={sampleOptions}
        defaultValue="hdfc"
      />,
    );
    const trigger = screen.getByRole('combobox');
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

  it('renders custom trigger through trigger slot and opens on click', () => {
    render(
      <Select
        options={sampleOptions}
        defaultValue="hdfc"
        trigger={<button type="button">Custom Account Trigger</button>}
      />,
    );
    expect(screen.getByText('Custom Account Trigger')).toBeInTheDocument();
    expect(screen.queryByText('ICICI Bank')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Custom Account Trigger'));
    expect(screen.getByText('ICICI Bank')).toBeInTheDocument();
  });

  it('opens Popover with flexible width (min-w-popover-trigger max-w-dialog-sm)', () => {
    render(
      <Select
        defaultOpen
        options={sampleOptions}
        defaultValue="hdfc"
      />,
    );

    const option = screen.getByText('ICICI Bank');
    const popoverContent = option.closest('[data-radix-popper-content-wrapper]')?.firstElementChild;
    expect(popoverContent).toHaveClass('min-w-popover-trigger');
    expect(popoverContent).toHaveClass('max-w-dialog-sm');
  });

  it('updates value and calls onValueChange in uncontrolled mode', () => {
    const handleValueChange = vi.fn();
    render(
      <Select
        options={sampleOptions}
        defaultValue="hdfc"
        defaultOpen
        onValueChange={handleValueChange}
      />,
    );
    fireEvent.click(screen.getByText('ICICI Bank'));
    expect(handleValueChange).toHaveBeenCalledWith('icici');
  });

  it('works in controlled mode with value and onValueChange', () => {
    const handleValueChange = vi.fn();
    const ControlledSelect = () => {
      const [val, setVal] = React.useState('hdfc');
      return (
        <Select
          options={sampleOptions}
          value={val}
          defaultOpen
          onValueChange={(v) => {
            setVal(v as string);
            handleValueChange(v);
          }}
        />
      );
    };
    render(<ControlledSelect />);
    fireEvent.click(screen.getByText('ICICI Bank'));
    expect(handleValueChange).toHaveBeenCalledWith('icici');
    expect(screen.getByText('ICICI Bank')).toBeInTheDocument();
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
        searchValue="NonExistent"
      />,
    );
    expect(screen.getByText(/No options match/)).toBeInTheDocument();
  });

  it('renders sectioned groups with header', () => {
    const groups = [
      { name: 'Banks', options: [{ value: 'hdfc', label: 'HDFC' }] },
      { name: 'Cards', options: [{ value: 'amex', label: 'Amex' }] },
    ];
    render(<SelectMenu groups={groups} />);

    expect(screen.getByText('Banks')).toBeInTheDocument();
    expect(screen.getByText('Cards')).toBeInTheDocument();
  });

  it('renders action row and fires click', () => {
    const onActionClick = vi.fn();
    render(
      <SelectMenu
        options={sampleOptions}
        actionRow="+ Add Bank"
        onActionClick={onActionClick}
      />,
    );

    const action = screen.getByText('+ Add Bank');
    fireEvent.click(action);
    expect(onActionClick).toHaveBeenCalledTimes(1);
  });
});
