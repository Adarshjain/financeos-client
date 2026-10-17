'use client';

import React, { forwardRef, useMemo, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { Popover } from '../Popover/Popover';
import { useControllableState } from '../useControllableState';
import { monthNames, weekdayLetters } from '../utils';

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

function computeYearRange(
  today: string,
  minDate?: string,
  maxDate?: string,
): number[] {
  const todayYear = parseInt(today.slice(0, 4), 10);
  const maxYear = maxDate ? parseInt(maxDate.slice(0, 4), 10) : todayYear + 10;
  const minYear = minDate ? parseInt(minDate.slice(0, 4), 10) : todayYear - 10;

  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }
  return years;
}

function isMonthDisabled(
  year: number,
  monthIndex: number,
  minDate?: string,
  maxDate?: string,
): boolean {
  const daysInM = new Date(year, monthIndex + 1, 0).getDate();
  const monthStart = toIsoDate(year, monthIndex, 1);
  const monthEnd = toIsoDate(year, monthIndex, daysInM);

  if (minDate && monthEnd < minDate) return true;
  if (maxDate && monthStart > maxDate) return true;
  return false;
}

function isYearDisabled(
  year: number,
  minDate?: string,
  maxDate?: string,
): boolean {
  if (minDate && `${year}-12-31` < minDate) return true;
  if (maxDate && `${year}-01-01` > maxDate) return true;
  return false;
}

function clampMonthForYear(
  year: number,
  targetMonth: number,
  minDate?: string,
  maxDate?: string,
): number {
  if (!isMonthDisabled(year, targetMonth, minDate, maxDate)) {
    return targetMonth;
  }
  const allowedMonths: number[] = [];
  for (let m = 0; m < 12; m++) {
    if (!isMonthDisabled(year, m, minDate, maxDate)) {
      allowedMonths.push(m);
    }
  }
  if (allowedMonths.length === 0) {
    return targetMonth;
  }
  if (targetMonth < allowedMonths[0]) {
    return allowedMonths[0];
  }
  if (targetMonth > allowedMonths[allowedMonths.length - 1]) {
    return allowedMonths[allowedMonths.length - 1];
  }
  let nearest = allowedMonths[0];
  let minDiff = Math.abs(targetMonth - nearest);
  for (const m of allowedMonths) {
    const diff = Math.abs(targetMonth - m);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = m;
    }
  }
  return nearest;
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
      onChange: onValueChange
        ? (v: MonthCalendarValue | undefined) => {
            if (v !== undefined) onValueChange(v);
          }
        : undefined,
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

    const [monthOpen, setMonthOpen] = useState(false);
    const [yearOpen, setYearOpen] = useState(false);

    const allMonthNames = useMemo(() => monthNames(), []);
    const yearOptions = useMemo(
      () => computeYearRange(today, minDate, maxDate),
      [today, minDate, maxDate],
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

    let prevY = currentYear;
    let prevM = currentMonth - 1;
    if (prevM < 0) {
      prevM = 11;
      prevY -= 1;
    }
    const daysInPrev = new Date(prevY, prevM + 1, 0).getDate();
    const prevMonthEnd = toIsoDate(prevY, prevM, daysInPrev);
    const isPrevDisabled = Boolean(minDate && prevMonthEnd < minDate);

    let nextY = currentYear;
    let nextM = currentMonth + 1;
    if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    const nextMonthStart = toIsoDate(nextY, nextM, 1);
    const isNextDisabled = Boolean(maxDate && nextMonthStart > maxDate);

    const handlePrevMonth = () => {
      if (isPrevDisabled) return;
      const nextIso = `${prevY}-${String(prevM + 1).padStart(2, '0')}-01`;
      setCurrentMonthIso(nextIso);
    };

    const handleNextMonth = () => {
      if (isNextDisabled) return;
      const nextIso = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`;
      setCurrentMonthIso(nextIso);
    };

    const handleSelectMonth = (monthIdx: number) => {
      const nextIso = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}-01`;
      setCurrentMonthIso(nextIso);
      setMonthOpen(false);
    };

    const handleSelectYear = (y: number) => {
      const newMonth = clampMonthForYear(y, currentMonth, minDate, maxDate);
      const nextIso = `${y}-${String(newMonth + 1).padStart(2, '0')}-01`;
      setCurrentMonthIso(nextIso);
      setYearOpen(false);
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
            disabled={isPrevDisabled}
            onClick={handlePrevMonth}
            className="text-ink-3 hover:text-ink shrink-0"
          >
            <Icon name="chevron-left" size="md" />
          </Button>

          <div className="flex items-center gap-space-4">
            <Popover
              open={monthOpen}
              onOpenChange={setMonthOpen}
              contentClassName="min-w-0 w-36 max-h-64 overflow-y-auto p-space-4"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Month"
                  icon={<Icon name="chevron-down" size="sm" />}
                  className="px-space-4 h-control-sm text-ink font-bold hover:bg-hover"
                >
                  {allMonthNames[currentMonth]}
                </Button>
              }
            >
              <div
                className="flex flex-col gap-space-2"
                role="listbox"
                aria-label="Month"
              >
                {allMonthNames.map((name, idx) => {
                  const isSelected = idx === currentMonth;
                  const disabled = isMonthDisabled(
                    currentYear,
                    idx,
                    minDate,
                    maxDate,
                  );
                  return (
                    <Button
                      key={name}
                      type="button"
                      variant={isSelected ? 'primary' : 'ghost'}
                      size="sm"
                      disabled={disabled}
                      onClick={() => handleSelectMonth(idx)}
                      className={cn(
                        'w-full justify-start text-left h-control-sm px-space-8 font-medium text-label',
                        isSelected ? 'font-bold' : 'text-ink hover:bg-hover',
                        disabled &&
                          'text-ink-faint opacity-40 cursor-not-allowed',
                      )}
                    >
                      {name}
                    </Button>
                  );
                })}
              </div>
            </Popover>

            <Popover
              open={yearOpen}
              onOpenChange={setYearOpen}
              contentClassName="min-w-0 w-28 max-h-64 overflow-y-auto p-space-4"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Year"
                  icon={<Icon name="chevron-down" size="sm" />}
                  className="px-space-4 h-control-sm text-ink font-bold hover:bg-hover"
                >
                  {currentYear}
                </Button>
              }
            >
              <div
                className="flex flex-col gap-space-2"
                role="listbox"
                aria-label="Year"
              >
                {yearOptions.map((y) => {
                  const isSelected = y === currentYear;
                  const disabled = isYearDisabled(y, minDate, maxDate);
                  return (
                    <Button
                      key={y}
                      type="button"
                      variant={isSelected ? 'primary' : 'ghost'}
                      size="sm"
                      disabled={disabled}
                      onClick={() => handleSelectYear(y)}
                      className={cn(
                        'w-full justify-start text-left h-control-sm px-space-8 font-medium text-label',
                        isSelected ? 'font-bold' : 'text-ink hover:bg-hover',
                        disabled &&
                          'text-ink-faint opacity-40 cursor-not-allowed',
                      )}
                    >
                      {y}
                    </Button>
                  );
                })}
              </div>
            </Popover>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Next month"
            disabled={isNextDisabled}
            onClick={handleNextMonth}
            className="text-ink-3 hover:text-ink shrink-0"
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
