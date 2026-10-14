import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DateTile, MonthCalendar } from './DateTile';

describe('DateTile', () => {
  it('renders day and month in uppercase', () => {
    render(<DateTile day={15} month="OCT" />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('OCT')).toBeInTheDocument();
  });
});

describe('MonthCalendar', () => {
  const sampleDays = [
    { day: 1 },
    { day: 2, today: true },
    {
      day: 3,
      events: [
        { kind: 'bill' as const, label: 'Credit card bill' },
        { kind: 'emi' as const, label: 'Car EMI' },
        { kind: 'in' as const, label: 'Salary credit' },
      ],
    },
  ];

  it('renders weekdays and day cells', () => {
    render(<MonthCalendar days={sampleDays} />);
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('highlights today cell', () => {
    const { container } = render(<MonthCalendar days={sampleDays} />);
    const todayCell = screen.getByText('2').closest('div');
    expect(todayCell).toHaveClass('bg-brand-tint');
    expect(todayCell).toHaveClass('text-brand-strong');
  });

  it('renders event indicator bars', () => {
    const { container } = render(<MonthCalendar days={sampleDays} />);
    const day3Cell = screen.getByText('3').closest('div');
    expect(day3Cell?.querySelector('.bg-warning')).toBeInTheDocument();
    expect(day3Cell?.querySelector('.bg-info')).toBeInTheDocument();
    expect(day3Cell?.querySelector('.bg-positive')).toBeInTheDocument();
  });

  it('triggers onSelectDay on click and keyboard press', () => {
    const handleSelect = vi.fn();
    render(<MonthCalendar days={sampleDays} onSelectDay={handleSelect} />);

    const day1Cell = screen.getByText('1').closest('div');
    expect(day1Cell).toHaveAttribute('role', 'button');

    fireEvent.click(day1Cell!);
    expect(handleSelect).toHaveBeenCalledWith(1);

    fireEvent.keyDown(day1Cell!, { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith(1);
  });
});
