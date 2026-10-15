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
  it('renders single date field with formatted initial value', () => {
    render(<DateField label="Due date" defaultValue="25102026" />);
    const input = screen.getByLabelText('Due date');
    expect(input).toHaveValue('25/10/2026');
  });

  it('auto-formats input as user types digits', () => {
    const handleChange = vi.fn();
    render(<DateField label="Date" onChange={handleChange} />);
    const input = screen.getByLabelText('Date');

    fireEvent.change(input, { target: { value: '01042026' } });
    expect(handleChange).toHaveBeenCalledWith('01/04/2026');
    expect(input).toHaveValue('01/04/2026');
  });

  it('renders helper and error text', () => {
    const { rerender } = render(
      <DateField label="Date" helper="Select past date" />,
    );
    expect(screen.getByText('Select past date')).toBeInTheDocument();

    rerender(<DateField label="Date" error="Invalid format" />);
    expect(screen.getByText('Invalid format')).toBeInTheDocument();
    expect(screen.getByText('Invalid format')).toHaveClass('text-danger');
  });

  it('renders disabled state', () => {
    render(<DateField label="Date" defaultValue="01/10/2026" disabled />);
    const input = screen.getByLabelText('Date');
    expect(input).toBeDisabled();
    const button = screen.getByRole('button', { name: 'Open calendar' });
    expect(button).toBeDisabled();
  });

  it('renders range mode as one combined field and auto-inserts separator on typing', () => {
    const handleRangeChange = vi.fn();
    render(
      <DateField
        range
        label="Period"
        defaultStartDate="01/10/2026"
        defaultEndDate="15/10/2026"
        onRangeChange={handleRangeChange}
      />,
    );

    const input = screen.getByLabelText('Period');
    expect(input).toHaveValue('01/10/2026 – 15/10/2026');

    // Type new start and end digits
    fireEvent.change(input, { target: { value: '05102026' } });
    expect(input).toHaveValue('05/10/2026 – ');

    fireEvent.change(input, { target: { value: '0510202620102026' } });
    expect(input).toHaveValue('05/10/2026 – 20/10/2026');
    expect(handleRangeChange).toHaveBeenCalledWith({
      startDate: '05/10/2026',
      endDate: '20/10/2026',
    });
  });

  it('picks range from calendar: first tap sets start, second tap sets end', () => {
    const handleRangeChange = vi.fn();
    render(
      <DateField
        range
        label="Period"
        defaultStartDate="01/10/2026"
        onRangeChange={handleRangeChange}
      />,
    );

    const openButton = screen.getByRole('button', { name: 'Open calendar' });
    fireEvent.click(openButton);

    // Click day 5 (first tap sets start)
    const day5Buttons = screen.getAllByRole('button', { name: '5' });
    fireEvent.click(day5Buttons[0]);
    expect(handleRangeChange).toHaveBeenCalledWith({
      startDate: '05/10/2026',
      endDate: '',
    });

    // Click day 20 (second tap sets end)
    const day20Buttons = screen.getAllByRole('button', { name: '20' });
    fireEvent.click(day20Buttons[0]);
    expect(handleRangeChange).toHaveBeenCalledWith({
      startDate: '05/10/2026',
      endDate: '20/10/2026',
    });
  });

  it('opens calendar and allows selecting date in single mode', () => {
    const handleChange = vi.fn();
    render(<DateField label="Due date" defaultValue="25/10/2026" onChange={handleChange} />);

    const openButton = screen.getByRole('button', { name: 'Open calendar' });
    fireEvent.click(openButton);

    // Calendar is open; pick a day, e.g. day 15
    const day15 = screen.getByRole('button', { name: '15' });
    fireEvent.click(day15);

    expect(handleChange).toHaveBeenCalled();
  });
});
