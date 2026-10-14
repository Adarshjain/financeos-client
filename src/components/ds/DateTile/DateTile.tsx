import React, { forwardRef } from 'react';

import { cn } from '../cn';

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
  /** List of weekday labels (default: ['M', 'T', 'W', 'T', 'F', 'S', 'S']) */
  weekdays?: string[];
  /** Days to render in the 7-column calendar grid */
  days?: CalendarDay[];
  /** Callback when a day cell is clicked */
  onSelectDay?: (day: number) => void;
  /** Currently selected day */
  selectedDay?: number;
  /** Whether to show a top border (default: true) */
  borderTop?: boolean;
}

export const MonthCalendar = forwardRef<HTMLDivElement, MonthCalendarProps>(
  (
    {
      weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      days = [],
      onSelectDay,
      selectedDay,
      borderTop = true,
      className,
      ...props
    },
    ref,
  ) => {
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
                'min-h-app-bar border-r border-b border-line-soft p-space-4 text-caption font-bold text-ink-3 flex flex-col gap-space-2 transition-colors',
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
  },
);

MonthCalendar.displayName = 'MonthCalendar';
