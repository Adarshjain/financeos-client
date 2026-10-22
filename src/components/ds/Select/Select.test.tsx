import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Select, SelectMenu, type SelectOption } from './Select';

const sampleOptions: SelectOption[] = [
  { value: 'hdfc', label: 'HDFC Bank', hint: '••4521', searchText: 'savings 4521' },
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

  it('a custom trigger sizes to its content, so trigger chips sit side by side', () => {
    const { container } = render(
      <Select options={sampleOptions} trigger={<button type="button">Account</button>} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('inline-block', 'w-auto');
    expect(root).not.toHaveClass('w-full');
  });

  it('opens Popover with flexible width (min-w-popover-trigger max-w-container-sm)', () => {
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
    expect(popoverContent).toHaveClass('desk:max-w-container-sm');
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

  it('renders hidden input when name is provided', () => {
    const { container } = render(
      <Select
        name="bankAccount"
        options={sampleOptions}
        defaultValue="hdfc"
      />,
    );
    const hidden = container.querySelector('input[type="hidden"][name="bankAccount"]');
    expect(hidden).toHaveValue('hdfc');
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

  it('filters by searchText if provided', () => {
    render(<SelectMenu searchable options={sampleOptions} searchValue="savings" />);
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.queryByText('ICICI Bank')).not.toBeInTheDocument();
  });

  it('renders generic "No results" when no matches found and no emptyText', () => {
    render(
      <SelectMenu
        searchable
        options={sampleOptions}
        searchValue="NonExistent"
      />,
    );
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('renders custom emptyText callback', () => {
    render(
      <SelectMenu
        searchable
        options={sampleOptions}
        searchValue="XYZ"
        emptyText={(q) => `No bank matches "${q}"`}
      />,
    );
    expect(screen.getByText('No bank matches "XYZ"')).toBeInTheDocument();
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
    const onSelect = vi.fn();
    render(
      <SelectMenu
        options={sampleOptions}
        action={{ label: '+ Add Bank', onSelect }}
      />,
    );

    const action = screen.getByText('+ Add Bank');
    fireEvent.click(action);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders custom clearLabel and doneLabel in multi mode', () => {
    render(
      <SelectMenu
        multiple
        options={sampleOptions}
        value={['hdfc']}
        clearLabel="Reset"
        doneLabel={(n) => `Apply (${n})`}
      />,
    );
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('Apply (1)')).toBeInTheDocument();
  });

  it('respects filter="none"', () => {
    render(
      <SelectMenu
        searchable
        filter="none"
        options={sampleOptions}
        searchValue="NonExistent"
      />,
    );
    // When filter="none", all options remain visible despite query
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.getByText('ICICI Bank')).toBeInTheDocument();
  });

  it('renders spinner and not chevron when loading', () => {
    const { container } = render(
      <Select
        loading
        loadingText="Loading options…"
        options={sampleOptions}
      />,
    );
    expect(screen.getByText('Loading options…')).toBeInTheDocument();
    const spinner = container.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
    const nonSpinningSvgs = container.querySelectorAll('svg:not(.animate-spin)');
    expect(nonSpinningSvgs.length).toBe(0);
  });
});

describe('Select multiple with create (account identifiers)', () => {
  function Identifiers({ onCreate = vi.fn() }: { onCreate?: (q: string) => void }) {
    const [options, setOptions] = React.useState<SelectOption[]>([{ value: 'XXXX4521', label: 'XXXX4521' }]);
    const [value, setValue] = React.useState<string[]>(['XXXX4521']);
    return (
      <Select
        multiple
        searchable
        defaultOpen
        searchPlaceholder="Add identifier"
        options={options}
        value={value}
        onValueChange={(v) => setValue(v as string[])}
        onCreate={(q) => {
          onCreate(q);
          setOptions((o) => [...o, { value: q, label: q }]);
          setValue((v) => [...v, q]);
        }}
      />
    );
  }
  const field = () => screen.getByPlaceholderText('Add identifier') as HTMLInputElement;

  it('creates from the typed text with Enter, selects it and clears the search', () => {
    const onCreate = vi.fn();
    render(<Identifiers onCreate={onCreate} />);
    fireEvent.change(field(), { target: { value: ' HDFCBANK ' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onCreate).toHaveBeenCalledWith('HDFCBANK');
    expect(field().value).toBe('');
    expect(screen.getByRole('option', { name: /HDFCBANK/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /XXXX4521/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('creates from the create row on click and clears the search', () => {
    const onCreate = vi.fn();
    render(<Identifiers onCreate={onCreate} />);
    fireEvent.change(field(), { target: { value: 'XXXX9911' } });
    fireEvent.click(screen.getByRole('button', { name: 'XXXX9911' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith('XXXX9911');
    expect(field().value).toBe('');
  });

  it('offers no create row for text that is already an option, whatever its case', () => {
    const onCreate = vi.fn();
    render(<Identifiers onCreate={onCreate} />);
    fireEvent.change(field(), { target: { value: 'xxxx4521' } });
    expect(screen.queryByRole('button', { name: 'xxxx4521' })).toBeNull();
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('creates nothing from a blank search', () => {
    const onCreate = vi.fn();
    render(<Identifiers onCreate={onCreate} />);
    fireEvent.change(field(), { target: { value: '   ' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onCreate).not.toHaveBeenCalled();
  });
});

describe('Select menu layout (UAT)', () => {
  it('pads the option list inside the popover edge', () => {
    const { container } = render(<SelectMenu options={sampleOptions} />);
    expect(container.firstChild).toHaveClass('p-space-6');
  });

  it('scrolls the list inside the menu and keeps wheel scrolling away from a scroll lock', () => {
    const lock = vi.fn();
    document.addEventListener('wheel', lock);
    const many = Array.from({ length: 58 }, (_, i) => ({
      value: `b${i}`,
      label: `Bank ${i}`,
    }));
    render(<SelectMenu options={many} searchable action={{ label: 'Add bank', onSelect: vi.fn() }} />);
    const list = screen.getByRole('listbox');
    expect(list).toHaveClass('overflow-y-auto', 'min-h-0');
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    fireEvent.wheel(list);
    expect(lock).not.toHaveBeenCalled();
    document.removeEventListener('wheel', lock);
  });

  it('draws Clear and Done at natural width, aligned right', () => {
    render(<SelectMenu options={sampleOptions} multiple />);
    const clear = screen.getByRole('button', { name: 'Clear' });
    const done = screen.getByRole('button', { name: 'Done' });
    expect(clear).not.toHaveClass('flex-1');
    expect(done).not.toHaveClass('flex-1');
    expect(done.parentElement).toHaveClass('justify-end');
  });

  it('draws the action row at natural width, aligned right', () => {
    render(<SelectMenu options={sampleOptions} action={{ label: '+ Add bank', onSelect: vi.fn() }} />);
    const action = screen.getByText('+ Add bank');
    expect(action).not.toHaveClass('w-full');
    expect(action.parentElement).toHaveClass('justify-end');
  });

  it('uses the md trigger height by default and control-sm for size="sm"', () => {
    const { rerender } = render(<Select options={sampleOptions} placeholder="Pick" />);
    expect(screen.getByRole('combobox')).toHaveClass('h-control-md', 'text-body');
    rerender(<Select size="sm" options={sampleOptions} placeholder="Pick" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('h-control-sm', 'text-label');
    expect(trigger).not.toHaveClass('h-control-md');
  });

  it('showRadio renders a Radio per option, checked for the selected one', () => {
    render(<SelectMenu options={sampleOptions} value="hdfc" showRadio />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(sampleOptions.length);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveAttribute('aria-checked', 'false');
  });
});
