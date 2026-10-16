import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MonthCalendar } from './MonthCalendar';

describe('MonthCalendar', () => {
  const sampleDays = [
    { day: 1 },
    { day: 2, today: true },
    {
      day: 3,
      events: [
        { tone: 'warning' as const, label: 'Warning event' },
        { tone: 'info' as const, label: 'Info event' },
        { tone: 'positive' as const, label: 'Positive event' },
      ],
    },
  ];

  it('renders weekdays and day cells in events mode', () => {
    render(<MonthCalendar mode="events" days={sampleDays} />);
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('highlights today cell in events mode', () => {
    render(<MonthCalendar mode="events" days={sampleDays} />);
    const todayCell = screen.getByText('2').closest('div');
    expect(todayCell).toHaveClass('bg-brand-tint');
    expect(todayCell).toHaveClass('text-brand-strong');
  });

  it('renders event indicator bars by tone', () => {
    render(<MonthCalendar mode="events" days={sampleDays} />);
    const day3Cell = screen.getByText('3').closest('div');
    expect(day3Cell?.querySelector('.bg-warning')).toBeInTheDocument();
    expect(day3Cell?.querySelector('.bg-info')).toBeInTheDocument();
    expect(day3Cell?.querySelector('.bg-positive')).toBeInTheDocument();
  });

  it('triggers onSelectDay on click and keyboard press in events mode', () => {
    const handleSelect = vi.fn();
    render(<MonthCalendar mode="events" days={sampleDays} onSelectDay={handleSelect} />);

    const day1Cell = screen.getByText('1').closest('div');
    expect(day1Cell).toHaveAttribute('role', 'button');

    fireEvent.click(day1Cell!);
    expect(handleSelect).toHaveBeenCalledWith(1);

    fireEvent.keyDown(day1Cell!, { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith(1);
  });

  it('renders picker mode with formatMonth header and Button day cells', () => {
    const handleSelectDate = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        month="2026-10-01"
        today="2026-10-13"
        selectedDate="2026-10-15"
        onSelectDate={handleSelectDate}
      />,
    );

    expect(screen.getByText('October 2026')).toBeInTheDocument();
    const day15Button = screen.getByRole('button', { name: '15' });
    expect(day15Button).toHaveClass('bg-brand');

    const day16Button = screen.getByRole('button', { name: '16' });
    fireEvent.click(day16Button);
    expect(handleSelectDate).toHaveBeenCalledWith('2026-10-16');
  });

  it('disables dates outside minDate and maxDate', () => {
    render(
      <MonthCalendar
        mode="picker"
        month="2026-10-01"
        minDate="2026-10-10"
        maxDate="2026-10-20"
      />,
    );

    const day5Button = screen.getByRole('button', { name: '5' });
    expect(day5Button).toBeDisabled();

    const day15Button = screen.getByRole('button', { name: '15' });
    expect(day15Button).not.toBeDisabled();

    const day25Button = screen.getByRole('button', { name: '25' });
    expect(day25Button).toBeDisabled();
  });

  it('renders footer with Today and Clear callbacks', () => {
    const handleToday = vi.fn();
    const handleClear = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        month="2026-10-01"
        showFooter
        onToday={handleToday}
        onClear={handleClear}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(handleToday).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
