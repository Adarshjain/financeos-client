'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { useControllableState } from '../useControllableState';
import { formatMonth, weekdayLetters } from '../utils';

export type CalendarEventTone =
  | 'positive'
  | 'warning'
  | 'info'
  | 'danger'
  | 'brand';

export interface CalendarEvent {
  tone?: CalendarEventTone;
  label?: string;
}

export interface CalendarDay {
  day: number;
  today?: boolean;
  selected?: boolean;
  events?: CalendarEvent[];
  disabled?: boolean;
}

export type MonthCalendarRangeValue = { start?: string; end?: string };
export type MonthCalendarValue = string | MonthCalendarRangeValue;

export interface MonthCalendarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'defaultValue'> {
  /** Mode: 'events' for overview grid, 'picker' for date selection */
  mode?: 'events' | 'picker';
  /** Range selection mode (picker mode only) */
  range?: boolean;

  /** Value in picker mode: ISO string 'yyyy-mm-dd' or { start?: string; end?: string } when range is true */
  value?: MonthCalendarValue;
  /** Default value in picker mode */
  defaultValue?: MonthCalendarValue;
  /** Callback when selected date or range changes */
  onValueChange?: (value: MonthCalendarValue) => void;

  /** Today ISO string (yyyy-mm-dd) passed from caller, required */
  today: string;

  /** Visible month in picker mode as ISO string (yyyy-mm-01) */
  month?: string;
  /** Default visible month as ISO string (yyyy-mm-01) */
  defaultMonth?: string;
  /** Callback when visible month changes (emits ISO yyyy-mm-01 string) */
  onMonthChange?: (monthISO: string) => void;

  /** Min selectable date (ISO yyyy-mm-dd) */
  minDate?: string;
  /** Max selectable date (ISO yyyy-mm-dd) */
  maxDate?: string;

  /** List of weekday labels (default: weekdayLetters() -> ['M', 'T', 'W', 'T', 'F', 'S', 'S']) */
  weekdays?: string[];
  /** Days to render in the 7-column calendar grid (for events mode) */
  days?: CalendarDay[];
  /** Callback when a day cell is clicked (events mode) */
  onSelectDay?: (day: number) => void;
  /** Currently selected day (events mode) */
  selectedDay?: number;
  /** Whether to show a top border in events mode (default: true) */
  borderTop?: boolean;

  /** Show footer with Today and Clear buttons */
  showFooter?: boolean;
  /** Callback for Today button */
  onToday?: () => void;
  /** Callback for Clear button */
  onClear?: () => void;
}

const eventToneStyles: Record<CalendarEventTone, string> = {
  positive: 'bg-positive',
  warning: 'bg-warning',
  info: 'bg-info',
  danger: 'bg-danger',
  brand: 'bg-brand',
};

function resolveEventTone(ev: CalendarEvent): string {
  if (ev.tone && eventToneStyles[ev.tone]) {
    return eventToneStyles[ev.tone];
  }
  return 'bg-brand';
}

function parseIsoToParts(iso?: string): { year: number; month: number } {
  if (!iso) return { year: 0, month: 0 };
  const match = iso.match(/^(\d{4})-(\d{2})/);
  if (!match) return { year: 0, month: 0 };
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10) - 1,
  };
}

function toIsoDate(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

export const MonthCalendar = forwardRef<HTMLDivElement, MonthCalendarProps>(
  (
    {
      mode = 'events',
      range = false,
      value,
      defaultValue,
      onValueChange,
      today,
      month,
      defaultMonth,
      onMonthChange,
      minDate,
      maxDate,
      weekdays = weekdayLetters(),
      days = [],
      onSelectDay,
      selectedDay,
      borderTop = true,
      showFooter = false,
      onToday,
      onClear,
      className,
      ...props
    },
    ref,
  ) => {
    const isEventsMode = mode === 'events';

    const [currentValue, setCurrentValue] = useControllableState<MonthCalendarValue | undefined>({
      value,
      defaultValue,
      onChange: onValueChange,
    });

    const defaultMonthIso = defaultMonth ?? `${today.slice(0, 7)}-01`;
    const [currentMonthIso, setCurrentMonthIso] = useControllableState<string>({
      value: month,
      defaultValue: defaultMonthIso,
      onChange: onMonthChange,
    });

    const { year: currentYear, month: currentMonth } = parseIsoToParts(
      currentMonthIso ?? defaultMonthIso,
    );

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
                      resolveEventTone(ev),
                    )}
                  />
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    // Picker mode navigation
    const handlePrevMonth = () => {
      let nextY = currentYear;
      let nextM = currentMonth - 1;
      if (nextM < 0) {
        nextM = 11;
        nextY -= 1;
      }
      const nextIso = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`;
      setCurrentMonthIso(nextIso);
    };

    const handleNextMonth = () => {
      let nextY = currentYear;
      let nextM = currentMonth + 1;
      if (nextM > 11) {
        nextM = 0;
        nextY += 1;
      }
      const nextIso = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`;
      setCurrentMonthIso(nextIso);
    };

    const handleDayClick = (iso: string) => {
      if (range) {
        const currentRange =
          currentValue && typeof currentValue === 'object'
            ? (currentValue as MonthCalendarRangeValue)
            : {};
        if (currentRange.start && !currentRange.end) {
          let start = currentRange.start;
          let end = iso;
          if (end < start) {
            const tmp = start;
            start = end;
            end = tmp;
          }
          setCurrentValue({ start, end });
        } else {
          setCurrentValue({ start: iso, end: undefined });
        }
      } else {
        setCurrentValue(iso);
      }
    };

    const displayMonthIso = currentMonthIso ?? defaultMonthIso;

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
      isoDate: string;
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
        isoDate: toIsoDate(prevY, prevM, d),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        year: currentYear,
        month: currentMonth,
        day: d,
        isOutside: false,
        isoDate: toIsoDate(currentYear, currentMonth, d),
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
        isoDate: toIsoDate(nextY, nextM, nextMonthDay),
      });
      nextMonthDay++;
    }

    const rangeVal =
      range && currentValue && typeof currentValue === 'object'
        ? (currentValue as MonthCalendarRangeValue)
        : undefined;
    const effectiveStartDate = rangeVal?.start;
    const effectiveEndDate = rangeVal?.end;
    const effectiveSelectedDate =
      !range && typeof currentValue === 'string' ? currentValue : undefined;

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
            {formatMonth(displayMonthIso)}
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
            const isToday = cell.isoDate === today;
            const isSelected = range
              ? cell.isoDate === effectiveStartDate || cell.isoDate === effectiveEndDate
              : cell.isoDate === effectiveSelectedDate;

            const isInRange = Boolean(
              range &&
                effectiveStartDate &&
                effectiveEndDate &&
                cell.isoDate > effectiveStartDate &&
                cell.isoDate < effectiveEndDate,
            );

            const isPastMin = minDate ? cell.isoDate < minDate : false;
            const isPastMax = maxDate ? cell.isoDate > maxDate : false;
            const isDisabled = isPastMin || isPastMax;

            return (
              <Button
                key={cell.isoDate}
                type="button"
                variant={isSelected ? 'primary' : 'ghost'}
                size="md"
                disabled={isDisabled}
                onClick={() => !isDisabled && handleDayClick(cell.isoDate)}
                className={cn(
                  'h-control-md w-full p-0 flex items-center justify-center font-text text-body font-semibold transition-colors rounded-ds-sm cursor-pointer',
                  cell.isOutside && 'text-ink-4 opacity-50',
                  !cell.isOutside && !isSelected && !isInRange && 'text-ink hover:bg-hover',
                  isToday && !isSelected && 'ring-1 ring-inset ring-brand text-brand',
                  isInRange && !isSelected && 'bg-brand-tint text-brand-strong rounded-none',
                  isSelected && 'bg-brand text-on-brand font-bold',
                  isDisabled && 'opacity-30 cursor-not-allowed pointer-events-none text-ink-4',
                )}
              >
                {cell.day}
              </Button>
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
