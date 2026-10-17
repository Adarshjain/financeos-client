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

    expect(screen.getByRole('button', { name: 'Choose month' })).toHaveTextContent('October');
    expect(screen.getByRole('button', { name: 'Choose year' })).toHaveTextContent('2026');
    const day15Button = screen.getByRole('button', { name: '15' });
    expect(day15Button).toHaveClass('bg-brand');

    const day16Button = screen.getByRole('button', { name: '16' });
    fireEvent.click(day16Button);
    expect(handleValueChange).toHaveBeenCalledWith('2026-10-16');
  });

  it('tapping "Choose month" shows 12 month cells (Jan...Dec), and tapping Mar calls onMonthChange and returns to days view', () => {
    const handleMonthChange = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        defaultMonth="2026-10-01"
        today="2026-10-13"
        onMonthChange={handleMonthChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose month' }));

    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    shortMonths.forEach((m) => {
      expect(screen.getByRole('button', { name: m })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mar' }));
    expect(handleMonthChange).toHaveBeenCalledWith('2026-03-01');
    expect(screen.getByRole('button', { name: 'Choose month' })).toHaveTextContent('March');
    expect(screen.getByRole('button', { name: '15' })).toBeInTheDocument();
  });

  it('tapping "Choose year" shows 2016–2027 for today="2026-10-13", and arrows page to 2004–2015 and 2028–2039', () => {
    render(
      <MonthCalendar
        mode="picker"
        month="2026-10-01"
        today="2026-10-13"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose year' }));
    expect(screen.getByText('2016 – 2027')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2016' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2027' })).toBeInTheDocument();

    // Page back
    fireEvent.click(screen.getByRole('button', { name: 'Previous years' }));
    expect(screen.getByText('2004 – 2015')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2004' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2015' })).toBeInTheDocument();

    // Page forward twice to 2028–2039
    fireEvent.click(screen.getByRole('button', { name: 'Next years' }));
    expect(screen.getByText('2016 – 2027')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next years' }));
    expect(screen.getByText('2028 – 2039')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2028' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2039' })).toBeInTheDocument();
  });

  it('tapping a year shows months view headed by that year without calling onMonthChange, and months arrows change browseYear', () => {
    const handleMonthChange = vi.fn();
    render(
      <MonthCalendar
        mode="picker"
        defaultMonth="2026-10-01"
        today="2026-10-13"
        onMonthChange={handleMonthChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose year' }));
    fireEvent.click(screen.getByRole('button', { name: '2024' }));

    expect(handleMonthChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Choose year' })).toHaveTextContent('2024');
    expect(screen.getByRole('button', { name: 'Jan' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous year' }));
    expect(screen.getByRole('button', { name: 'Choose year' })).toHaveTextContent('2023');

    fireEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(screen.getByRole('button', { name: 'Choose year' })).toHaveTextContent('2024');
  });

  it('respects minDate="2024-03-10" and maxDate="2026-11-20" across views and arrows', () => {
    render(
      <MonthCalendar
        mode="picker"
        month="2026-10-01"
        today="2026-10-13"
        minDate="2024-03-10"
        maxDate="2026-11-20"
      />,
    );

    // Switch to months view for 2024
    fireEvent.click(screen.getByRole('button', { name: 'Choose year' }));
    fireEvent.click(screen.getByRole('button', { name: '2024' }));

    // Jan and Feb 2024 are disabled, Mar 2024 is enabled
    expect(screen.getByRole('button', { name: 'Jan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Feb' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mar' })).not.toBeDisabled();

    // Months-view ‹ is disabled at 2024
    expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled();

    // Advance to 2026
    fireEvent.click(screen.getByRole('button', { name: 'Next year' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(screen.getByRole('button', { name: 'Choose year' })).toHaveTextContent('2026');

    // Dec 2026 is disabled, Nov 2026 is enabled
    expect(screen.getByRole('button', { name: 'Dec' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nov' })).not.toBeDisabled();

    // Months-view › is disabled at 2026
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();

    // Switch to years view (page 2016–2027)
    fireEvent.click(screen.getByRole('button', { name: 'Choose year' }));
    expect(screen.getByText('2016 – 2027')).toBeInTheDocument();

    // Years 2023 and 2027 are disabled
    expect(screen.getByRole('button', { name: '2023' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '2027' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '2024' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: '2026' })).not.toBeDisabled();

    // Years-view arrows are both disabled on 2016–2027 page
    expect(screen.getByRole('button', { name: 'Previous years' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next years' })).toBeDisabled();
  });

  it('applies selected look to shown month and today ring to today month and year', () => {
    render(
      <MonthCalendar
        mode="picker"
        defaultMonth="2026-03-01"
        today="2026-10-13"
      />,
    );

    // Enter months view
    fireEvent.click(screen.getByRole('button', { name: 'Choose month' }));

    // Shown month is Mar 2026: selected look
    const marBtn = screen.getByRole('button', { name: 'Mar' });
    expect(marBtn).toHaveClass('bg-brand');
    expect(marBtn).toHaveClass('text-on-brand');

    // Today is Oct 2026: today ring
    const octBtn = screen.getByRole('button', { name: 'Oct' });
    expect(octBtn).toHaveClass('ring-1');
    expect(octBtn).toHaveClass('ring-brand');
    expect(octBtn).toHaveClass('text-brand');

    // Switch to years view
    fireEvent.click(screen.getByRole('button', { name: 'Choose year' }));

    // Shown year is 2026, today year is 2026 -> selected
    const y2026 = screen.getByRole('button', { name: '2026' });
    expect(y2026).toHaveClass('bg-brand');
    expect(y2026).toHaveClass('text-on-brand');

    // Switch to another year e.g. 2024 to verify today ring on year
    fireEvent.click(screen.getByRole('button', { name: '2024' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose year' }));
    const y2024 = screen.getByRole('button', { name: '2024' });
    expect(y2024).toHaveClass('bg-brand');
    const y2026After = screen.getByRole('button', { name: '2026' });
    expect(y2026After).toHaveClass('ring-1');
    expect(y2026After).toHaveClass('ring-brand');
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
