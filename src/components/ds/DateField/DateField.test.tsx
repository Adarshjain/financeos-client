import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DateField, formatDateInput } from './DateField';

describe('formatDateInput helper', () => {
  it('adds slashes automatically as digits are entered', () => {
    expect(formatDateInput('13')).toBe('13');
    expect(formatDateInput('1310')).toBe('13/10');
    expect(formatDateInput('13102026')).toBe('13/10/2026');
  });

  it('converts ISO yyyy-mm-dd to dd/mm/yyyy', () => {
    expect(formatDateInput('2026-10-13')).toBe('13/10/2026');
  });
});

describe('DateField component', () => {
  const TODAY = '2026-10-13';

  it('renders single date field with formatted initial value', () => {
    render(<DateField today={TODAY} label="Due date" defaultValue="2026-10-25" />);
    const input = screen.getByLabelText('Due date');
    expect(input).toHaveValue('25/10/2026');
  });

  it('auto-formats input as user types digits in uncontrolled mode with onValueChange emitting ISO', () => {
    const handleChange = vi.fn();
    render(<DateField today={TODAY} label="Date" defaultValue="2026-01-01" onValueChange={handleChange} />);
    const input = screen.getByLabelText('Date');
    expect(input).toHaveValue('01/01/2026');

    // Partial input does not fire onValueChange
    fireEvent.change(input, { target: { value: '01' } });
    expect(handleChange).not.toHaveBeenCalled();

    // Full valid date fires onValueChange with ISO
    fireEvent.change(input, { target: { value: '01042026' } });
    expect(handleChange).toHaveBeenCalledWith('2026-04-01');
    expect(input).toHaveValue('01/04/2026');
  });

  it('works in controlled mode with ISO value and onValueChange', () => {
    const handleValueChange = vi.fn();
    const { rerender } = render(
      <DateField today={TODAY} label="Due date" value="2026-10-10" onValueChange={handleValueChange} />,
    );
    const input = screen.getByLabelText('Due date');
    expect(input).toHaveValue('10/10/2026');

    fireEvent.change(input, { target: { value: '15102026' } });
    expect(handleValueChange).toHaveBeenCalledWith('2026-10-15');

    rerender(<DateField today={TODAY} label="Due date" value="2026-10-15" onValueChange={handleValueChange} />);
    expect(input).toHaveValue('15/10/2026');
  });

  it('reports the empty value when the text is deleted (uncontrolled)', () => {
    const handleChange = vi.fn();
    render(<DateField today={TODAY} label="Date" defaultValue="2026-01-01" onValueChange={handleChange} />);
    const input = screen.getByLabelText('Date');
    fireEvent.change(input, { target: { value: '' } });
    expect(handleChange).toHaveBeenCalledWith('');
    expect(input).toHaveValue('');
  });

  it('reports the empty value when the text is deleted (controlled)', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <DateField today={TODAY} label="Date" value="2026-01-01" onValueChange={handleChange} />,
    );
    const input = screen.getByLabelText('Date');
    fireEvent.change(input, { target: { value: '' } });
    expect(handleChange).toHaveBeenCalledWith('');
    rerender(<DateField today={TODAY} label="Date" value="" onValueChange={handleChange} />);
    expect(input).toHaveValue('');
  });

  it('reports nothing for partial text while editing down', () => {
    const handleChange = vi.fn();
    render(<DateField today={TODAY} label="Date" defaultValue="2026-01-01" onValueChange={handleChange} />);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '01/0' } });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('reports an empty range when range text is deleted', () => {
    const handleChange = vi.fn();
    render(
      <DateField
        today={TODAY}
        label="Period"
        range
        defaultValue={{ start: '2026-10-01', end: '2026-10-13' }}
        onValueChange={handleChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Period'), { target: { value: '' } });
    expect(handleChange).toHaveBeenCalledWith({ start: '', end: '' });
  });

  it('spreads native HTML input attributes like name and data-testid', () => {
    render(<DateField today={TODAY} name="due_date" data-testid="due-input" />);
    const input = screen.getByTestId('due-input');
    expect(input).toHaveAttribute('name', 'due_date');
  });

  it('renders helper and error text', () => {
    const { rerender } = render(
      <DateField today={TODAY} label="Date" helper="Select past date" />,
    );
    expect(screen.getByText('Select past date')).toBeInTheDocument();

    rerender(<DateField today={TODAY} label="Date" error="Invalid format" />);
    expect(screen.getByText('Invalid format')).toBeInTheDocument();
    expect(screen.getByText('Invalid format')).toHaveClass('text-danger');
  });

  it('renders disabled state', () => {
    render(<DateField today={TODAY} label="Date" defaultValue="2026-10-01" disabled />);
    const input = screen.getByLabelText('Date');
    expect(input).toBeDisabled();
    const button = screen.getByRole('button', { name: 'Open calendar' });
    expect(button).toBeDisabled();
  });

  it('respects custom placeholder in range mode', () => {
    render(<DateField today={TODAY} range placeholder="Custom Range" />);
    const input = screen.getByPlaceholderText('Custom Range');
    expect(input).toBeInTheDocument();
  });

  it('renders range mode as one combined field and auto-inserts separator on typing', () => {
    const handleValueChange = vi.fn();
    render(
      <DateField
        today={TODAY}
        range
        label="Period"
        defaultValue={{ start: '2026-10-01', end: '2026-10-15' }}
        onValueChange={handleValueChange}
      />,
    );

    const input = screen.getByLabelText('Period');
    expect(input).toHaveValue('01/10/2026 – 15/10/2026');

    // Type new start and end digits
    fireEvent.change(input, { target: { value: '05102026' } });
    expect(input).toHaveValue('05/10/2026 – ');

    fireEvent.change(input, { target: { value: '0510202620102026' } });
    expect(input).toHaveValue('05/10/2026 – 20/10/2026');
    expect(handleValueChange).toHaveBeenCalledWith({
      start: '2026-10-05',
      end: '2026-10-20',
    });
  });

  it('picks range from calendar: first tap sets start, second tap sets end', () => {
    const handleValueChange = vi.fn();
    render(
      <DateField
        today={TODAY}
        range
        label="Period"
        defaultValue={{ start: '2026-10-01' }}
        onValueChange={handleValueChange}
        defaultOpen
      />,
    );

    // Click day 5 (first tap sets start)
    const day5Buttons = screen.getAllByRole('button', { name: '5' });
    fireEvent.click(day5Buttons[0]);

    // Click day 20 (second tap sets end)
    const day20Buttons = screen.getAllByRole('button', { name: '20' });
    fireEvent.click(day20Buttons[0]);

    expect(handleValueChange).toHaveBeenCalledWith({
      start: '2026-10-05',
      end: '2026-10-20',
    });
  });

  it('picks an earlier end date from the calendar and swaps start and end', () => {
    const handleValueChange = vi.fn();
    render(<DateField today={TODAY} range label="Period" onValueChange={handleValueChange} defaultOpen />);

    fireEvent.click(screen.getAllByRole('button', { name: '20' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '5' })[0]);

    expect(handleValueChange).toHaveBeenCalledWith({ start: '2026-10-05', end: '2026-10-20' });
    expect(screen.getByLabelText('Period')).toHaveValue('05/10/2026 – 20/10/2026');
  });

  it('starts a new range on the first tap when a start date is already set', () => {
    const handleValueChange = vi.fn();
    render(
      <DateField
        today={TODAY}
        range
        label="Period"
        defaultValue={{ start: '2026-10-20' }}
        onValueChange={handleValueChange}
        defaultOpen
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: '5' })[0]);

    expect(handleValueChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Period')).toHaveValue('05/10/2026 – ');
  });

  it('opens calendar and allows selecting date in single mode emitting ISO', () => {
    const handleChange = vi.fn();
    render(<DateField today={TODAY} label="Due date" defaultValue="2026-10-25" onValueChange={handleChange} />);

    const openButton = screen.getByRole('button', { name: 'Open calendar' });
    fireEvent.click(openButton);

    // Calendar is open; pick a day, e.g. day 15
    const day15 = screen.getByRole('button', { name: '15' });
    fireEvent.click(day15);

    expect(handleChange).toHaveBeenCalledWith('2026-10-15');
  });

  it('widens calendar popover for range mode with w-max and max-w-none', () => {
    render(
      <DateField today={TODAY} range label="Period" defaultOpen />,
    );
    const popoverContent = document.body.querySelector('[data-radix-popper-content-wrapper] > div');
    expect(popoverContent).toHaveClass('w-max');
    expect(popoverContent).toHaveClass('max-w-none');
    const classList = Array.from(popoverContent?.classList ?? []);
    expect(classList).not.toContain('max-w-container-sm');
  });

  it('keeps calendar popover open when switching views and picking month', () => {
    render(<DateField today={TODAY} label="Due date" defaultValue="2026-10-25" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));

    expect(screen.getByRole('button', { name: 'Choose month' })).toHaveTextContent('October');
    expect(screen.getByRole('button', { name: 'Choose year' })).toHaveTextContent('2026');

    // Tap "Choose month"
    fireEvent.click(screen.getByRole('button', { name: 'Choose month' }));
    expect(screen.getByRole('button', { name: 'Mar' })).toBeInTheDocument();

    // Tap Mar
    fireEvent.click(screen.getByRole('button', { name: 'Mar' }));
    // Popover stays open and Choose month button now reads March
    expect(screen.getByRole('button', { name: 'Choose month' })).toHaveTextContent('March');
    expect(screen.getByRole('button', { name: 'Choose year' })).toBeInTheDocument();
  });
});

describe('DateField control (UAT)', () => {
  it('is built from TextField: same control height and no brand border on focus', () => {
    const { container } = render(<DateField label="Date" today="2026-10-13" />);
    const box = container.querySelector('.h-control-md');
    expect(box).toBeInTheDocument();
    expect(container.querySelector('.h-control-xl')).toBeNull();
    expect(box?.className).not.toMatch(/focus-within:border-/);
    expect(box).toHaveClass('focus-within:ring-2');
  });

  it('keeps typing, the calendar button and the error state', () => {
    render(<DateField label="Date" today="2026-10-13" error="Pick a date" />);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '13102026' } });
    expect(screen.getByLabelText('Date')).toHaveValue('13/10/2026');
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeInTheDocument();
    expect(screen.getByText('Pick a date')).toBeInTheDocument();
  });
});
