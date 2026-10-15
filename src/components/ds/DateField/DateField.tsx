'use client';

import React, { forwardRef, useId, useRef, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { MonthCalendar } from '../DateTile/DateTile';
import { FieldFrame } from '../FieldFrame';
import { Icon } from '../Icon/Icon';
import { ResponsiveOverlay } from '../ResponsiveOverlay/ResponsiveOverlay';

export interface DateFieldProps {
  id?: string;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;

  /** Single date mode: formatted as dd/mm/yyyy */
  value?: string;
  defaultValue?: string;
  onChange?: (dateStr: string) => void;

  /** Range mode: one combined field "dd/mm/yyyy – dd/mm/yyyy" */
  range?: boolean;
  startDate?: string;
  endDate?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  onRangeChange?: (range: { startDate: string; endDate: string }) => void;

  /** Min/Max selectable dates (dd/mm/yyyy) */
  minDate?: string;
  maxDate?: string;
}

export function formatDateInput(val: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  }
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatRangeInput(val: string): {
  display: string;
  startDate: string;
  endDate: string;
} {
  if (!val) return { display: '', startDate: '', endDate: '' };

  const digits = val.replace(/\D/g, '').slice(0, 16);
  const startDigits = digits.slice(0, 8);
  const endDigits = digits.slice(8, 16);

  let startFormatted = '';
  if (startDigits.length <= 2) {
    startFormatted = startDigits;
  } else if (startDigits.length <= 4) {
    startFormatted = `${startDigits.slice(0, 2)}/${startDigits.slice(2)}`;
  } else {
    startFormatted = `${startDigits.slice(0, 2)}/${startDigits.slice(2, 4)}/${startDigits.slice(4)}`;
  }

  let endFormatted = '';
  if (endDigits.length > 0) {
    if (endDigits.length <= 2) {
      endFormatted = endDigits;
    } else if (endDigits.length <= 4) {
      endFormatted = `${endDigits.slice(0, 2)}/${endDigits.slice(2)}`;
    } else {
      endFormatted = `${endDigits.slice(0, 2)}/${endDigits.slice(2, 4)}/${endDigits.slice(4)}`;
    }
  }

  let display = startFormatted;
  if (startDigits.length === 8) {
    display = endFormatted ? `${startFormatted} – ${endFormatted}` : `${startFormatted} – `;
  }

  return {
    display,
    startDate: startDigits.length === 8 ? startFormatted : '',
    endDate: endDigits.length === 8 ? endFormatted : '',
  };
}

function parseDateStr(val?: string): Date | null {
  if (!val) return null;
  const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const y = parseInt(match[3], 10);
    return new Date(y, m, d);
  }
  return null;
}

function getTodayStr(): string {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${today.getFullYear()}`;
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  (
    {
      id: explicitId,
      label,
      helper,
      error,
      optional = false,
      disabled = false,
      className,
      placeholder = 'dd/mm/yyyy',
      value: controlledValue,
      defaultValue,
      onChange,
      range = false,
      startDate: controlledStartDate,
      endDate: controlledEndDate,
      defaultStartDate,
      defaultEndDate,
      onRangeChange,
      minDate,
      maxDate,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId ?? generatedId;
    const helperId = `${id}-helper`;

    const [isOpen, setOpen] = useState(false);

    // Single mode state
    const [internalValue, setInternalValue] = useState<string>(
      defaultValue ? formatDateInput(defaultValue) : '',
    );
    const currentValue =
      controlledValue !== undefined
        ? formatDateInput(controlledValue)
        : internalValue;

    // Range mode state
    const initialStart = defaultStartDate ? formatDateInput(defaultStartDate) : '';
    const initialEnd = defaultEndDate ? formatDateInput(defaultEndDate) : '';
    const [internalStart, setInternalStart] = useState<string>(initialStart);
    const [internalEnd, setInternalEnd] = useState<string>(initialEnd);

    const initialDisplay =
      initialStart && initialEnd
        ? `${initialStart} – ${initialEnd}`
        : initialStart
          ? `${initialStart} – `
          : '';

    const [internalRangeInput, setInternalRangeInput] = useState<string>(initialDisplay);
    const prevRangeInputRef = useRef<string>(initialDisplay);

    const currentStart =
      controlledStartDate !== undefined
        ? formatDateInput(controlledStartDate)
        : internalStart;
    const currentEnd =
      controlledEndDate !== undefined
        ? formatDateInput(controlledEndDate)
        : internalEnd;

    const displayRange =
      controlledStartDate !== undefined || controlledEndDate !== undefined
        ? currentStart && currentEnd
          ? `${currentStart} – ${currentEnd}`
          : currentStart
            ? `${currentStart} – `
            : ''
        : internalRangeInput;

    // Calendar view state (year/month)
    const baseDate = parseDateStr(currentStart) ?? parseDateStr(currentValue) ?? new Date();
    const [viewYear, setViewYear] = useState<number>(baseDate.getFullYear());
    const [viewMonth, setViewMonth] = useState<number>(baseDate.getMonth());

    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;

    // 0 = next click sets start, 1 = next click sets end
    const [rangeStep, setRangeStep] = useState<0 | 1>(0);

    const hasError = Boolean(error);

    const handleSingleInputChange = (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const formatted = formatDateInput(e.target.value);
      setInternalValue(formatted);
      onChange?.(formatted);
    };

    const handleRangeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (
        prevRangeInputRef.current.endsWith(' – ') &&
        val.length < prevRangeInputRef.current.length &&
        !val.includes(' –')
      ) {
        val = val.replace(/\D*$/, '').slice(0, -1);
      }
      const formatted = formatRangeInput(val);
      prevRangeInputRef.current = formatted.display;
      setInternalRangeInput(formatted.display);
      setInternalStart(formatted.startDate);
      setInternalEnd(formatted.endDate);
      onRangeChange?.({
        startDate: formatted.startDate,
        endDate: formatted.endDate,
      });
    };

    const handleSelectDateFromCalendar = (dateStr: string) => {
      if (!range) {
        setInternalValue(dateStr);
        onChange?.(dateStr);
        setOpen(false);
      } else {
        if (rangeStep === 0 || (currentStart && currentEnd)) {
          // First tap: set start date
          setInternalStart(dateStr);
          setInternalEnd('');
          const disp = `${dateStr} – `;
          setInternalRangeInput(disp);
          prevRangeInputRef.current = disp;
          setRangeStep(1);
          onRangeChange?.({ startDate: dateStr, endDate: '' });
        } else {
          // Second tap: set end date
          const startObj = parseDateStr(currentStart);
          const endObj = parseDateStr(dateStr);
          let finalStart = currentStart;
          let finalEnd = dateStr;
          if (startObj && endObj && endObj < startObj) {
            finalStart = dateStr;
            finalEnd = currentStart;
          }
          setInternalStart(finalStart);
          setInternalEnd(finalEnd);
          const disp = `${finalStart} – ${finalEnd}`;
          setInternalRangeInput(disp);
          prevRangeInputRef.current = disp;
          setRangeStep(0);
          onRangeChange?.({ startDate: finalStart, endDate: finalEnd });
          setOpen(false);
        }
      }
    };

    const handleToday = () => {
      const todayStr = getTodayStr();
      if (!range) {
        setInternalValue(todayStr);
        onChange?.(todayStr);
        setOpen(false);
      } else {
        setInternalStart(todayStr);
        setInternalEnd('');
        const disp = `${todayStr} – `;
        setInternalRangeInput(disp);
        prevRangeInputRef.current = disp;
        setRangeStep(1);
        onRangeChange?.({ startDate: todayStr, endDate: '' });
      }
    };

    const handleClear = () => {
      if (!range) {
        setInternalValue('');
        onChange?.('');
        setOpen(false);
      } else {
        setInternalStart('');
        setInternalEnd('');
        setInternalRangeInput('');
        prevRangeInputRef.current = '';
        setRangeStep(0);
        onRangeChange?.({ startDate: '', endDate: '' });
        setOpen(false);
      }
    };

    const handleMonthChange = (y: number, m: number) => {
      setViewYear(y);
      setViewMonth(m);
    };

    // Calendar content: two months side by side on desktop in range mode, one month on phone or in single mode
    const calendarContent = range ? (
      <div className="flex flex-col bg-surface">
        <div className="flex flex-row divide-x divide-line-soft">
          <MonthCalendar
            mode="picker"
            year={viewYear}
            month={viewMonth}
            onMonthChange={handleMonthChange}
            startDate={currentStart}
            endDate={currentEnd}
            minDate={minDate}
            maxDate={maxDate}
            onSelectDate={handleSelectDateFromCalendar}
          />
          <div className="hidden lg:block">
            <MonthCalendar
              mode="picker"
              year={nextMonthYear}
              month={nextMonth}
              onMonthChange={(y, m) => {
                let prevM = m - 1;
                let prevY = y;
                if (prevM < 0) {
                  prevM = 11;
                  prevY -= 1;
                }
                setViewYear(prevY);
                setViewMonth(prevM);
              }}
              startDate={currentStart}
              endDate={currentEnd}
              minDate={minDate}
              maxDate={maxDate}
              onSelectDate={handleSelectDateFromCalendar}
            />
          </div>
        </div>
        <div className="flex items-center justify-between p-space-8 border-t border-line-soft">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleToday}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="ml-auto text-ink-3 hover:text-ink"
          >
            Clear
          </Button>
        </div>
      </div>
    ) : (
      <MonthCalendar
        mode="picker"
        selectedDate={currentValue}
        minDate={minDate}
        maxDate={maxDate}
        onSelectDate={handleSelectDateFromCalendar}
        showFooter
        onToday={handleToday}
        onClear={handleClear}
      />
    );

    const triggerButton = (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        iconOnly
        disabled={disabled}
        aria-label="Open calendar"
        onClick={() => {
          if (!disabled) {
            setOpen(!isOpen);
          }
        }}
        className="text-ink-3 hover:text-ink shrink-0"
      >
        <Icon name="calendar" size="md" />
      </Button>
    );

    return (
      <FieldFrame
        id={id}
        helperId={helperId}
        label={label}
        optional={optional}
        helper={helper}
        error={error}
        className={className}
      >
        <div
          className={cn(
            'flex items-center gap-space-8 h-control-lg w-full px-space-12 border rounded-ds-md bg-surface font-text font-medium text-body text-ink',
            'transition-colors duration-fast focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2',
            hasError
              ? 'border-danger focus-within:ring-danger'
              : 'border-line-strong focus-within:border-brand',
            disabled &&
              'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
          )}
        >
          <input
            ref={ref}
            id={id}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            placeholder={range ? 'dd/mm/yyyy – dd/mm/yyyy' : placeholder}
            value={range ? displayRange : currentValue}
            onChange={range ? handleRangeInputChange : handleSingleInputChange}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={hasError || helper ? helperId : undefined}
            className={cn(
              'w-full h-full bg-transparent border-0 p-0 text-body text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0',
              disabled && 'cursor-not-allowed text-ink-faint',
            )}
            {...props}
          />

          <ResponsiveOverlay
            open={isOpen}
            onOpenChange={setOpen}
            trigger={triggerButton}
            title={
              typeof label === 'string'
                ? label
                : range
                  ? 'Select date range'
                  : 'Select date'
            }
            dialogBodyClassName="p-0 flex justify-center"
            popoverContentClassName={cn(
              'p-0 overflow-hidden shadow-pop',
              range ? 'max-w-dialog-md w-auto' : '',
            )}
          >
            {calendarContent}
          </ResponsiveOverlay>
        </div>
      </FieldFrame>
    );
  },
);

DateField.displayName = 'DateField';
