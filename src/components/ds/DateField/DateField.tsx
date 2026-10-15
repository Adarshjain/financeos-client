import { Calendar as CalendarIcon } from 'lucide-react';
import React, { forwardRef, useId, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { MonthCalendar } from '../DateTile/DateTile';
import { Dialog, DialogBody, DialogContent } from '../Dialog/Dialog';
import { FieldFrame } from '../FieldFrame';
import { Icon } from '../Icon/Icon';
import { PopoverContent, PopoverRoot, PopoverTrigger } from '../Popover/Popover';
import { useIsPhone } from '../useMediaQuery';

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

  /** Range mode: two typed inputs (From and To) sharing one calendar */
  range?: boolean;
  fromLabel?: React.ReactNode;
  toLabel?: React.ReactNode;
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
      fromLabel = 'From',
      toLabel = 'To',
      startDate: controlledStartDate,
      endDate: controlledEndDate,
      defaultStartDate,
      defaultEndDate,
      onRangeChange,
      minDate,
      maxDate,
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId ?? generatedId;
    const helperId = `${id}-helper`;
    const isPhone = useIsPhone();

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
    const [internalStart, setInternalStart] = useState<string>(
      defaultStartDate ? formatDateInput(defaultStartDate) : '',
    );
    const [internalEnd, setInternalEnd] = useState<string>(
      defaultEndDate ? formatDateInput(defaultEndDate) : '',
    );
    const currentStart =
      controlledStartDate !== undefined
        ? formatDateInput(controlledStartDate)
        : internalStart;
    const currentEnd =
      controlledEndDate !== undefined
        ? formatDateInput(controlledEndDate)
        : internalEnd;

    // Range selection picking state: 0 = start, 1 = end
    const [rangeStep, setRangeStep] = useState<0 | 1>(0);

    const hasError = Boolean(error);

    const handleSingleInputChange = (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const formatted = formatDateInput(e.target.value);
      setInternalValue(formatted);
      onChange?.(formatted);
    };

    const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDateInput(e.target.value);
      setInternalStart(formatted);
      onRangeChange?.({ startDate: formatted, endDate: currentEnd });
    };

    const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDateInput(e.target.value);
      setInternalEnd(formatted);
      onRangeChange?.({ startDate: currentStart, endDate: formatted });
    };

    const handleSelectDateFromCalendar = (dateStr: string) => {
      if (!range) {
        setInternalValue(dateStr);
        onChange?.(dateStr);
        setOpen(false);
      } else {
        if (rangeStep === 0 || (currentStart && currentEnd)) {
          setInternalStart(dateStr);
          setInternalEnd('');
          setRangeStep(1);
          onRangeChange?.({ startDate: dateStr, endDate: '' });
        } else {
          // Setting end date
          const startDateObj = parseDateStr(currentStart);
          const endDateObj = parseDateStr(dateStr);
          if (startDateObj && endDateObj && endDateObj < startDateObj) {
            // Swap
            setInternalStart(dateStr);
            setInternalEnd(currentStart);
            onRangeChange?.({ startDate: dateStr, endDate: currentStart });
          } else {
            setInternalEnd(dateStr);
            onRangeChange?.({ startDate: currentStart, endDate: dateStr });
          }
          setRangeStep(0);
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
        setRangeStep(0);
        onRangeChange?.({ startDate: '', endDate: '' });
        setOpen(false);
      }
    };

    const calendarContent = (
      <MonthCalendar
        mode="picker"
        selectedDate={!range ? currentValue : undefined}
        startDate={range ? currentStart : undefined}
        endDate={range ? currentEnd : undefined}
        minDate={minDate}
        maxDate={maxDate}
        onSelectDate={handleSelectDateFromCalendar}
        showFooter
        onToday={handleToday}
        onClear={handleClear}
      />
    );

    if (range) {
      return (
        <div className={cn('w-full font-text text-body', className)}>
          {label ? (
            <div className="font-text font-bold text-label text-ink-2 mb-space-6 select-none">
              {label}
              {optional ? (
                <span className="font-medium text-ink-4 ml-space-4">
                  (Optional)
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-space-8 max-w-sm">
            {/* From field */}
            <div className="flex-1 min-w-0">
              <label
                htmlFor={`${id}-from`}
                className="block font-text font-bold text-label text-ink-2 mb-space-6 select-none"
              >
                {fromLabel}
              </label>
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
                  id={`${id}-from`}
                  type="text"
                  inputMode="numeric"
                  disabled={disabled}
                  placeholder={placeholder}
                  value={currentStart}
                  onChange={handleStartInputChange}
                  aria-invalid={hasError ? 'true' : undefined}
                  className={cn(
                    'w-full h-full bg-transparent border-0 p-0 text-body text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0',
                    disabled && 'cursor-not-allowed text-ink-faint',
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconOnly
                  disabled={disabled}
                  aria-label="Open calendar for start date"
                  onClick={() => {
                    if (!disabled) {
                      setRangeStep(0);
                      setOpen(!isOpen);
                    }
                  }}
                  className="text-ink-3 hover:text-ink shrink-0"
                >
                  <Icon icon={CalendarIcon} size="md" />
                </Button>
              </div>
            </div>

            {/* To field */}
            <div className="flex-1 min-w-0">
              <label
                htmlFor={`${id}-to`}
                className="block font-text font-bold text-label text-ink-2 mb-space-6 select-none"
              >
                {toLabel}
              </label>
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
                  id={`${id}-to`}
                  type="text"
                  inputMode="numeric"
                  disabled={disabled}
                  placeholder={placeholder}
                  value={currentEnd}
                  onChange={handleEndInputChange}
                  aria-invalid={hasError ? 'true' : undefined}
                  className={cn(
                    'w-full h-full bg-transparent border-0 p-0 text-body text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0',
                    disabled && 'cursor-not-allowed text-ink-faint',
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconOnly
                  disabled={disabled}
                  aria-label="Open calendar for end date"
                  onClick={() => {
                    if (!disabled) {
                      setRangeStep(1);
                      setOpen(!isOpen);
                    }
                  }}
                  className="text-ink-3 hover:text-ink shrink-0"
                >
                  <Icon icon={CalendarIcon} size="md" />
                </Button>
              </div>
            </div>
          </div>

          {/* Dialog on phone, Popover on desktop */}
          {isPhone ? (
            <Dialog open={isOpen} onOpenChange={setOpen}>
              <DialogContent
                title="Select date range"
                onClose={() => setOpen(false)}
              >
                <DialogBody className="p-0 flex justify-center">
                  {calendarContent}
                </DialogBody>
              </DialogContent>
            </Dialog>
          ) : (
            <PopoverRoot open={isOpen} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <span className="sr-only">Date picker popover trigger</span>
              </PopoverTrigger>
              <PopoverContent
                width="content"
                className="p-0 overflow-hidden shadow-pop"
              >
                {calendarContent}
              </PopoverContent>
            </PopoverRoot>
          )}

          {hasError ? (
            <div
              id={helperId}
              className="mt-space-6 font-text font-medium text-caption text-danger"
            >
              {error}
            </div>
          ) : helper ? (
            <div
              id={helperId}
              className="mt-space-6 font-text font-medium text-caption text-ink-3"
            >
              {helper}
            </div>
          ) : null}
        </div>
      );
    }

    // Single mode
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
        <PopoverRoot open={isOpen} onOpenChange={setOpen}>
          <div
            className={cn(
              'flex items-center gap-space-8 h-control-lg w-full max-w-sm px-space-12 border rounded-ds-md bg-surface font-text font-medium text-body text-ink',
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
              placeholder={placeholder}
              value={currentValue}
              onChange={handleSingleInputChange}
              aria-invalid={hasError ? 'true' : undefined}
              aria-describedby={hasError || helper ? helperId : undefined}
              className={cn(
                'w-full h-full bg-transparent border-0 p-0 text-body text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0',
                disabled && 'cursor-not-allowed text-ink-faint',
              )}
            />

            {isPhone ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                disabled={disabled}
                aria-label="Open calendar"
                onClick={() => !disabled && setOpen(!isOpen)}
                className="text-ink-3 hover:text-ink shrink-0"
              >
                <Icon icon={CalendarIcon} size="md" />
              </Button>
            ) : (
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconOnly
                  disabled={disabled}
                  aria-label="Open calendar"
                  onClick={() => !disabled && setOpen(!isOpen)}
                  className="text-ink-3 hover:text-ink shrink-0"
                >
                  <Icon icon={CalendarIcon} size="md" />
                </Button>
              </PopoverTrigger>
            )}
          </div>

          {isPhone ? (
            <Dialog open={isOpen} onOpenChange={setOpen}>
              <DialogContent
                title={label || 'Select date'}
                onClose={() => setOpen(false)}
              >
                <DialogBody className="p-0 flex justify-center">
                  {calendarContent}
                </DialogBody>
              </DialogContent>
            </Dialog>
          ) : (
            <PopoverContent
              width="content"
              className="p-0 overflow-hidden shadow-pop"
            >
              {calendarContent}
            </PopoverContent>
          )}
        </PopoverRoot>
      </FieldFrame>
    );
  },
);

DateField.displayName = 'DateField';
