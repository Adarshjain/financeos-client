import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  it('renders options as radio buttons', () => {
    render(<SegmentedControl options={['Debit', 'Credit']} />);
    const group = screen.getByRole('radiogroup');
    expect(group).toBeInTheDocument();

    const debit = screen.getByRole('radio', { name: 'Debit' });
    const credit = screen.getByRole('radio', { name: 'Credit' });
    expect(debit).toBeInTheDocument();
    expect(credit).toBeInTheDocument();
    expect(debit).toHaveAttribute('aria-checked', 'true');
    expect(credit).toHaveAttribute('aria-checked', 'false');
  });

  it('selects option specified by defaultValue', () => {
    render(
      <SegmentedControl
        options={['Debit', 'Credit']}
        defaultValue="Credit"
      />,
    );
    expect(screen.getByRole('radio', { name: 'Debit' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('radio', { name: 'Credit' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('calls onChange and updates state on click in uncontrolled mode', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={['Preset', 'Single date', 'Range']}
        defaultValue="Preset"
        onValueChange={handleChange}
      />,
    );
    const rangeBtn = screen.getByRole('radio', { name: 'Range' });

    fireEvent.click(rangeBtn);
    expect(handleChange).toHaveBeenCalledWith('Range');
    expect(rangeBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('works in controlled mode', () => {
    const ControlledDemo = () => {
      const [val, setVal] = useState('List');
      return (
        <SegmentedControl
          options={['List', 'Calendar']}
          value={val}
          onValueChange={setVal}
        />
      );
    };

    render(<ControlledDemo />);
    const calendarBtn = screen.getByRole('radio', { name: 'Calendar' });
    expect(calendarBtn).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(calendarBtn);
    expect(calendarBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('navigates options via keyboard arrows', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={['Debit', 'Credit']}
        defaultValue="Debit"
        onValueChange={handleChange}
      />,
    );
    const debitBtn = screen.getByRole('radio', { name: 'Debit' });

    fireEvent.keyDown(debitBtn, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith('Credit');
    expect(screen.getByRole('radio', { name: 'Credit' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    const creditBtn = screen.getByRole('radio', { name: 'Credit' });
    fireEvent.keyDown(creditBtn, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith('Debit');
    expect(screen.getByRole('radio', { name: 'Debit' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('does not change selection when whole control is disabled', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        disabled
        options={['Debit', 'Credit']}
        defaultValue="Debit"
        onValueChange={handleChange}
      />,
    );
    const creditBtn = screen.getByRole('radio', { name: 'Credit' });

    fireEvent.click(creditBtn);
    expect(handleChange).not.toHaveBeenCalled();
    expect(creditBtn).toHaveAttribute('aria-checked', 'false');
  });

  it('does not allow selecting disabled option', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived', disabled: true },
        ]}
        defaultValue="all"
        onValueChange={handleChange}
      />,
    );
    const archivedBtn = screen.getByRole('radio', { name: 'Archived' });
    expect(archivedBtn).toBeDisabled();

    fireEvent.click(archivedBtn);
    expect(handleChange).not.toHaveBeenCalled();
  });
});
