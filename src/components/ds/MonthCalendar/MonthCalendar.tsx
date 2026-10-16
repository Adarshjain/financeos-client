'use client';

import React, { forwardRef, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
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
  /** @deprecated use tone */
  kind?: 'bill' | 'in' | 'emi';
}

export interface CalendarDay {
  day: number;
  today?: boolean;
  selected?: boolean;
  events?: CalendarEvent[];
  disabled?: boolean;
}

export interface MonthCalendarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'defaultValue'> {
  /** Mode: 'events' for overview grid, 'picker' for date selection */
  mode?: 'events' | 'picker';
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

  /** Today ISO string (yyyy-mm-dd) passed from caller */
  today?: string;

  /** Visible month in picker mode as ISO string (yyyy-mm or yyyy-mm-01) */
  month?: string | number;
  /** Default visible month as ISO string */
  defaultMonth?: string;
  /** Callback when visible month changes (emits ISO yyyy-mm-01 string) */
  onMonthChange?: ((monthISO: string) => void) | ((year: number, month: number) => void);

  /** Legacy year for picker mode */
  year?: number;

  /** Selected date in picker mode as ISO string (yyyy-mm-dd) */
  selectedDate?: string;
  value?: string | { start?: string; end?: string };
  defaultValue?: string | { start?: string; end?: string };
  onValueChange?: (val: string | { start?: string; end?: string }) => void;

  /** Range start date in picker mode as ISO string (yyyy-mm-dd) */
  startDate?: string;
  /** Range end date in picker mode as ISO string (yyyy-mm-dd) */
  endDate?: string;
  /** Min selectable date (ISO yyyy-mm-dd) */
  minDate?: string;
  /** Max selectable date (ISO yyyy-mm-dd) */
  maxDate?: string;
  /** Callback when date is selected in picker mode (emits ISO yyyy-mm-dd) */
  onSelectDate?: (iso: string) => void;
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
  if (ev.kind === 'bill') return 'bg-warning';
  if (ev.kind === 'in') return 'bg-positive';
  if (ev.kind === 'emi') return 'bg-info';
  return 'bg-brand';
}

function parseIsoToParts(iso?: string): { year: number; month: number } | null {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
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
      weekdays = weekdayLetters(),
      days = [],
      onSelectDay,
      selectedDay,
      borderTop = true,
      today: explicitToday,
      month: controlledMonthProp,
      defaultMonth,
      onMonthChange,
      year: legacyYear,
      selectedDate,
      value,
      defaultValue,
      onValueChange,
      startDate: propStartDate,
      endDate: propEndDate,
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
    // Mode decides alone: events always renders events grid; picker always renders picker
    const isEventsMode = mode === 'events';

    // Derive effective value & range from value or selectedDate / startDate / endDate
    const effectiveSelectedDate = (() => {
      if (typeof value === 'string') return value;
      if (selectedDate) return selectedDate;
      if (typeof defaultValue === 'string') return defaultValue;
      return undefined;
    })();

    const effectiveStartDate = (() => {
      if (value && typeof value === 'object' && 'start' in value) return value.start;
      if (propStartDate) return propStartDate;
      if (defaultValue && typeof defaultValue === 'object' && 'start' in defaultValue) return defaultValue.start;
      return undefined;
    })();

    const effectiveEndDate = (() => {
      if (value && typeof value === 'object' && 'end' in value) return value.end;
      if (propEndDate) return propEndDate;
      if (defaultValue && typeof defaultValue === 'object' && 'end' in defaultValue) return defaultValue.end;
      return undefined;
    })();

    // Compute initial year/month from props, today or ISO
    const initialParts =
      parseIsoToParts(
        typeof controlledMonthProp === 'string'
          ? controlledMonthProp
          : defaultMonth ?? effectiveSelectedDate ?? effectiveStartDate ?? explicitToday,
      ) ?? { year: legacyYear ?? 2026, month: typeof controlledMonthProp === 'number' ? controlledMonthProp : 9 };

    const [internalYear, setInternalYear] = useState<number>(initialParts.year);
    const [internalMonth, setInternalMonth] = useState<number>(initialParts.month);

    let currentYear = internalYear;
    let currentMonth = internalMonth;

    if (typeof controlledMonthProp === 'string') {
      const parts = parseIsoToParts(controlledMonthProp);
      if (parts) {
        currentYear = parts.year;
        currentMonth = parts.month;
      }
    } else if (typeof controlledMonthProp === 'number') {
      currentMonth = controlledMonthProp;
      if (legacyYear !== undefined) {
        currentYear = legacyYear;
      }
    }

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
    const fireMonthChange = (nextY: number, nextM: number) => {
      setInternalYear(nextY);
      setInternalMonth(nextM);
      if (onMonthChange) {
        const isoMonth = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`;
        // Handle both (iso: string) and legacy (year: number, month: number)
        (onMonthChange as (a: string | number, b?: number) => void)(isoMonth, nextM);
      }
    };

    const handlePrevMonth = () => {
      let nextY = currentYear;
      let nextM = currentMonth - 1;
      if (nextM < 0) {
        nextM = 11;
        nextY -= 1;
      }
      fireMonthChange(nextY, nextM);
    };

    const handleNextMonth = () => {
      let nextY = currentYear;
      let nextM = currentMonth + 1;
      if (nextM > 11) {
        nextM = 0;
        nextY += 1;
      }
      fireMonthChange(nextY, nextM);
    };

    const handleDayClick = (iso: string) => {
      onSelectDate?.(iso);
      onValueChange?.(iso);
    };

    const currentMonthIso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

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
            {formatMonth(currentMonthIso)}
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
            const isToday = explicitToday ? cell.isoDate === explicitToday : false;
            const isSelected =
              cell.isoDate === effectiveSelectedDate ||
              cell.isoDate === effectiveStartDate ||
              cell.isoDate === effectiveEndDate;

            const isInRange = Boolean(
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
