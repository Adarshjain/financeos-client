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
    render(<MonthCalendar mode="events" today="2026-10-13" days={sampleDays} />);
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('highlights today cell in events mode', () => {
    render(<MonthCalendar mode="events" today="2026-10-13" days={sampleDays} />);
    const todayCell = screen.getByText('2').closest('div');
    expect(todayCell).toHaveClass('bg-brand-tint');
    expect(todayCell).toHaveClass('text-brand-strong');
  });

  it('renders event indicator bars by tone', () => {
    render(<MonthCalendar mode="events" today="2026-10-13" days={sampleDays} />);
    const day3Cell = screen.getByText('3').closest('div');
    expect(day3Cell?.querySelector('.bg-warning')).toBeInTheDocument();
    expect(day3Cell?.querySelector('.bg-info')).toBeInTheDocument();
    expect(day3Cell?.querySelector('.bg-positive')).toBeInTheDocument();
  });

  it('triggers onSelectDay on click and keyboard press in events mode', () => {
    const handleSelect = vi.fn();
    render(<MonthCalendar mode="events" today="2026-10-13" days={sampleDays} onSelectDay={handleSelect} />);

    const day1Cell = screen.getByText('1').closest('div');
    expect(day1Cell).toHaveAttribute('role', 'button');

    fireEvent.click(day1Cell!);
    expect(handleSelect).toHaveBeenCalledWith(1);

    fireEvent.keyDown(day1Cell!, { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith(1);
  });

  it('renders picker mode with formatMonth header and Button day cells, firing onValueChange', () => {
    const handleValueChange = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        month="2026-10-01"
        today="2026-10-13"
        value="2026-10-15"
        onValueChange={handleValueChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Month' })).toHaveTextContent('October');
    expect(screen.getByRole('button', { name: 'Year' })).toHaveTextContent('2026');
    const day15Button = screen.getByRole('button', { name: '15' });
    expect(day15Button).toHaveClass('bg-brand');

    const day16Button = screen.getByRole('button', { name: '16' });
    fireEvent.click(day16Button);
    expect(handleValueChange).toHaveBeenCalledWith('2026-10-16');
  });

  it('allows selecting a month from dropdown, updating view and calling onMonthChange', () => {
    const handleMonthChange = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        defaultMonth="2026-10-01"
        today="2026-10-13"
        onMonthChange={handleMonthChange}
      />,
    );

    const monthBtn = screen.getByRole('button', { name: 'Month' });
    fireEvent.click(monthBtn);

    const marchOption = screen.getByRole('button', { name: 'March' });
    fireEvent.click(marchOption);

    expect(handleMonthChange).toHaveBeenCalledWith('2026-03-01');
    expect(screen.getByRole('button', { name: 'Month' })).toHaveTextContent('March');
  });

  it('allows selecting a year from dropdown, updating view and calling onMonthChange', () => {
    const handleMonthChange = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        defaultMonth="2026-10-01"
        today="2026-10-13"
        onMonthChange={handleMonthChange}
      />,
    );

    const yearBtn = screen.getByRole('button', { name: 'Year' });
    fireEvent.click(yearBtn);

    const year2028 = screen.getByRole('button', { name: '2028' });
    fireEvent.click(year2028);

    expect(handleMonthChange).toHaveBeenCalledWith('2028-10-01');
    expect(screen.getByRole('button', { name: 'Year' })).toHaveTextContent('2028');
  });

  it('disables previous and next month buttons at minDate and maxDate boundaries', () => {
    const { rerender } = render(
      <MonthCalendar
        mode="picker"
        month="2026-05-01"
        today="2026-05-15"
        minDate="2026-05-10"
        maxDate="2026-07-20"
      />,
    );

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).not.toBeDisabled();

    rerender(
      <MonthCalendar
        mode="picker"
        month="2026-07-01"
        today="2026-05-15"
        minDate="2026-05-10"
        maxDate="2026-07-20"
      />,
    );

    expect(screen.getByRole('button', { name: 'Previous month' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('disables out-of-range months in dropdown and clamps year list based on minDate and maxDate', () => {
    render(
      <MonthCalendar
        mode="picker"
        month="2026-06-01"
        today="2026-06-15"
        minDate="2026-05-10"
        maxDate="2026-08-20"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    expect(screen.getByRole('button', { name: 'April' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'May' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'June' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'July' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'August' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'September' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Year' }));
    expect(screen.queryByRole('button', { name: '2025' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2027' })).not.toBeInTheDocument();
  });

  it('clamps month to nearest allowed month when switching year out of bounds', () => {
    const handleMonthChange = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        defaultMonth="2026-08-01"
        today="2026-08-15"
        minDate="2026-05-01"
        maxDate="2027-03-31"
        onMonthChange={handleMonthChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Year' }));
    fireEvent.click(screen.getByRole('button', { name: '2027' }));

    expect(handleMonthChange).toHaveBeenCalledWith('2027-03-01');
    expect(screen.getByRole('button', { name: 'Month' })).toHaveTextContent('March');
    expect(screen.getByRole('button', { name: 'Year' })).toHaveTextContent('2027');
  });

  it('handles range selection: first click sets start, second click sets end', () => {
    const handleValueChange = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        range
        month="2026-10-01"
        today="2026-10-13"
        onValueChange={handleValueChange}
      />,
    );

    // First click on 12: sets start
    const day12 = screen.getByRole('button', { name: '12' });
    fireEvent.click(day12);
    expect(handleValueChange).toHaveBeenCalledWith({ start: '2026-10-12', end: undefined });

    // Second click on 18: sets end
    const day18 = screen.getByRole('button', { name: '18' });
    fireEvent.click(day18);
    expect(handleValueChange).toHaveBeenCalledWith({ start: '2026-10-12', end: '2026-10-18' });
  });

  it('swaps start and end if second click comes before start in range mode', () => {
    const handleValueChange = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        range
        month="2026-10-01"
        today="2026-10-13"
        value={{ start: '2026-10-18', end: undefined }}
        onValueChange={handleValueChange}
      />,
    );

    // Second click on 12 which is before start 18 -> swaps start and end
    const day12 = screen.getByRole('button', { name: '12' });
    fireEvent.click(day12);
    expect(handleValueChange).toHaveBeenCalledWith({ start: '2026-10-12', end: '2026-10-18' });
  });

  it('disables dates outside minDate and maxDate', () => {
    render(
      <MonthCalendar
        mode="picker"
        month="2026-10-01"
        today="2026-10-13"
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
        today="2026-10-13"
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

  it('navigates months with previous and next buttons, firing onMonthChange with ISO yyyy-mm-01', () => {
    const handleMonthChange = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        month="2026-10-01"
        today="2026-10-13"
        onMonthChange={handleMonthChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(handleMonthChange).toHaveBeenCalledWith('2026-09-01');

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(handleMonthChange).toHaveBeenCalledWith('2026-11-01');
  });
});
