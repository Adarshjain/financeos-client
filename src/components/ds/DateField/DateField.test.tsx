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

  it('renders range mode with From and To fields', () => {
    const handleRangeChange = vi.fn();
    render(
      <DateField
        range
        fromLabel="Start"
        toLabel="End"
        defaultStartDate="01/10/2026"
        defaultEndDate="15/10/2026"
        onRangeChange={handleRangeChange}
      />,
    );

    const fromInput = screen.getByLabelText('Start');
    const toInput = screen.getByLabelText('End');
    expect(fromInput).toHaveValue('01/10/2026');
    expect(toInput).toHaveValue('15/10/2026');

    fireEvent.change(fromInput, { target: { value: '05102026' } });
    expect(handleRangeChange).toHaveBeenCalledWith({
      startDate: '05/10/2026',
      endDate: '15/10/2026',
    });
  });

  it('opens calendar and allows selecting date', () => {
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
