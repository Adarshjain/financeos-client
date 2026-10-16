'use client';

import React, { forwardRef, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export interface DateTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Day number, e.g. 15, 23, 28 */
  day: number | string;
  /** Month short name, e.g. "OCT", "NOV" */
  month: string;
}

export const DateTile = forwardRef<HTMLDivElement, DateTileProps>(
  ({ day, month, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('w-10 text-center shrink-0 select-none', className)}
        {...props}
      >
        <b className="block text-heading font-extrabold text-ink leading-none">
          {day}
        </b>
        <span className="block text-overline font-extrabold tracking-wider text-ink-4 uppercase mt-space-2 leading-none">
          {month}
        </span>
      </div>
    );
  },
);

DateTile.displayName = 'DateTile';

export type CalendarEventKind = 'bill' | 'in' | 'emi';

export interface CalendarEvent {
  kind: CalendarEventKind;
  label?: string;
}

export interface CalendarDay {
  day: number;
  today?: boolean;
  selected?: boolean;
  events?: CalendarEvent[];
  disabled?: boolean;
}

export interface MonthCalendarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Mode: 'events' for overview grid, 'picker' for date selection */
  mode?: 'events' | 'picker';
  /** List of weekday labels (default: ['M', 'T', 'W', 'T', 'F', 'S', 'S']) */
  weekdays?: string[];
  /** Days to render in the 7-column calendar grid (for events mode) */
  days?: CalendarDay[];
  /** Callback when a day cell is clicked (events mode) */
  onSelectDay?: (day: number) => void;
  /** Currently selected day (events mode) */
  selectedDay?: number;
  /** Whether to show a top border in events mode (default: true) */
  borderTop?: boolean;

  /** Year for picker mode (e.g. 2026) */
  year?: number;
  /** Month index for picker mode (0-11, e.g. 9 for October) */
  month?: number;
  /** Callback when month/year changes in picker mode */
  onMonthChange?: (year: number, month: number) => void;
  /** Selected single date in picker mode (dd/mm/yyyy) */
  selectedDate?: string;
  /** Range start date in picker mode (dd/mm/yyyy) */
  startDate?: string;
  /** Range end date in picker mode (dd/mm/yyyy) */
  endDate?: string;
  /** Min selectable date (dd/mm/yyyy) */
  minDate?: string;
  /** Max selectable date (dd/mm/yyyy) */
  maxDate?: string;
  /** Callback when date is selected in picker mode */
  onSelectDate?: (dateStr: string) => void;
  /** Show footer with Today and Clear buttons */
  showFooter?: boolean;
  /** Callback for Today button */
  onToday?: () => void;
  /** Callback for Clear button */
  onClear?: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parseDateStr(val?: string): Date | null {
  if (!val) return null;
  const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const y = parseInt(match[3], 10);
    return new Date(y, m, d);
  }
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(y, m, d);
  }
  return null;
}

function formatDateStr(year: number, month: number, day: number): string {
  const dd = String(day).padStart(2, '0');
  const mm = String(month + 1).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

export const MonthCalendar = forwardRef<HTMLDivElement, MonthCalendarProps>(
  (
    {
      mode = 'events',
      weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      days = [],
      onSelectDay,
      selectedDay,
      borderTop = true,
      year: controlledYear,
      month: controlledMonth,
      onMonthChange,
      selectedDate,
      startDate,
      endDate,
      minDate,
      maxDate,
      onSelectDate,
      showFooter = false,
      onToday,
      onClear,
      className,
      ...props
    },
    ref,
  ) => {
    // If days are passed and mode is not explicitly 'picker', render the events calendar
    const isEventsMode = mode === 'events' && days.length > 0 && controlledYear === undefined;

    const initialDate = parseDateStr(selectedDate) ?? parseDateStr(startDate) ?? new Date();
    const [internalYear, setInternalYear] = useState<number>(initialDate.getFullYear());
    const [internalMonth, setInternalMonth] = useState<number>(initialDate.getMonth());

    const currentYear = controlledYear ?? internalYear;
    const currentMonth = controlledMonth ?? internalMonth;

    if (isEventsMode) {
      return (
        <div
          ref={ref}
          className={cn(
            'grid grid-cols-7 border-l border-line-soft select-none',
            borderTop ? 'border-t border-line-soft' : 'border-t-0',
            className,
          )}
          {...props}
        >
          {/* Weekday headers */}
          {weekdays.map((wd, idx) => (
            <div
              key={idx}
              className="text-overline font-extrabold uppercase text-ink-4 py-space-8 px-space-6 text-center"
            >
              {wd}
            </div>
          ))}

          {/* Days grid */}
          {days.map((d, idx) => {
            const isSelected =
              selectedDay !== undefined
                ? selectedDay === d.day
                : Boolean(d.selected);
            const isToday = Boolean(d.today);

            return (
              <div
                key={idx}
                role={onSelectDay ? 'button' : undefined}
                tabIndex={onSelectDay ? 0 : undefined}
                onClick={onSelectDay ? () => onSelectDay(d.day) : undefined}
                onKeyDown={
                  onSelectDay
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectDay(d.day);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'min-h-space-56 border-r border-b border-line-soft p-space-4 text-caption font-bold text-ink-3 flex flex-col gap-space-4 transition-colors',
                  isToday && 'bg-brand-tint text-brand-strong',
                  isSelected &&
                    'ring-1 ring-inset ring-brand bg-brand-tint text-brand-strong',
                  onSelectDay && 'hover:bg-hover cursor-pointer',
                )}
              >
                <span>{d.day}</span>
                {d.events?.map((ev, evIdx) => (
                  <div
                    key={evIdx}
                    title={ev.label}
                    className={cn(
                      'h-space-6 rounded-ds-xs w-full',
                      ev.kind === 'bill' && 'bg-warning',
                      ev.kind === 'in' && 'bg-positive',
                      ev.kind === 'emi' && 'bg-info',
                    )}
                  />
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    // Picker mode
    const handlePrevMonth = () => {
      let nextY = currentYear;
      let nextM = currentMonth - 1;
      if (nextM < 0) {
        nextM = 11;
        nextY -= 1;
      }
      setInternalYear(nextY);
      setInternalMonth(nextM);
      onMonthChange?.(nextY, nextM);
    };

    const handleNextMonth = () => {
      let nextY = currentYear;
      let nextM = currentMonth + 1;
      if (nextM > 11) {
        nextM = 0;
        nextY += 1;
      }
      setInternalYear(nextY);
      setInternalMonth(nextM);
      onMonthChange?.(nextY, nextM);
    };

    const today = new Date();
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    const parsedMin = parseDateStr(minDate);
    const parsedMax = parseDateStr(maxDate);
    const parsedStart = parseDateStr(startDate);
    const parsedEnd = parseDateStr(endDate);

    // Compute month grid
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayDow = new Date(currentYear, currentMonth, 1).getDay();
    // Monday-based offset: Sunday (0) becomes 6, Monday (1) becomes 0
    const startOffset = (firstDayDow + 6) % 7;
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    interface GridCell {
      year: number;
      month: number;
      day: number;
      isOutside: boolean;
      dateStr: string;
      dateObj: Date;
    }

    const cells: GridCell[] = [];

    // Prev month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const d = daysInPrevMonth - i;
      cells.push({
        year: prevY,
        month: prevM,
        day: d,
        isOutside: true,
        dateStr: formatDateStr(prevY, prevM, d),
        dateObj: new Date(prevY, prevM, d),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        year: currentYear,
        month: currentMonth,
        day: d,
        isOutside: false,
        dateStr: formatDateStr(currentYear, currentMonth, d),
        dateObj: new Date(currentYear, currentMonth, d),
      });
    }

    // Next month days to fill grid (target 35 or 42)
    const targetLength = cells.length > 35 ? 42 : 35;
    let nextMonthDay = 1;
    while (cells.length < targetLength) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      cells.push({
        year: nextY,
        month: nextM,
        day: nextMonthDay,
        isOutside: true,
        dateStr: formatDateStr(nextY, nextM, nextMonthDay),
        dateObj: new Date(nextY, nextM, nextMonthDay),
      });
      nextMonthDay++;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'w-72 max-w-full bg-surface font-text text-body select-none',
          className,
        )}
        {...props}
      >
        {/* Calendar header */}
        <div className="flex items-center justify-between px-space-8 py-space-8 font-bold text-label text-ink">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Previous month"
            onClick={handlePrevMonth}
            className="text-ink-3 hover:text-ink"
          >
            <Icon name="chevron-left" size="md" />
          </Button>

          <span className="font-bold text-label text-ink">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Next month"
            onClick={handleNextMonth}
            className="text-ink-3 hover:text-ink"
          >
            <Icon name="chevron-right" size="md" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center font-bold text-caption text-ink-4 py-space-4">
          {weekdays.map((wd, idx) => (
            <div key={idx}>{wd}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 text-center p-space-6 gap-y-space-2">
          {cells.map((cell) => {
            const isToday = cell.dateStr === todayStr;
            const isSelected =
              cell.dateStr === selectedDate ||
              cell.dateStr === startDate ||
              cell.dateStr === endDate;

            const isInRange = Boolean(
              parsedStart &&
                parsedEnd &&
                cell.dateObj > parsedStart &&
                cell.dateObj < parsedEnd,
            );

            const isPastMin = parsedMin ? cell.dateObj < parsedMin : false;
            const isPastMax = parsedMax ? cell.dateObj > parsedMax : false;
            const isDisabled = isPastMin || isPastMax;

            return (
              <button
                key={cell.dateStr}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && onSelectDate?.(cell.dateStr)}
                className={cn(
                  'h-control-md w-full flex items-center justify-center font-text text-body font-semibold transition-colors rounded-ds-sm cursor-pointer',
                  cell.isOutside && 'text-ink-4 opacity-50',
                  !cell.isOutside && !isSelected && !isInRange && 'text-ink hover:bg-hover',
                  isToday && !isSelected && 'ring-1 ring-inset ring-brand text-brand',
                  isInRange && !isSelected && 'bg-brand-tint text-brand-strong rounded-none',
                  isSelected && 'bg-brand text-on-brand font-bold',
                  isDisabled && 'opacity-30 cursor-not-allowed pointer-events-none text-ink-4',
                )}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        {/* Optional footer */}
        {showFooter ? (
          <div className="flex items-center justify-between p-space-8 border-t border-line-soft">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onToday}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="ml-auto text-ink-3 hover:text-ink"
            >
              Clear
            </Button>
          </div>
        ) : null}
      </div>
    );
  },
);

MonthCalendar.displayName = 'MonthCalendar';
