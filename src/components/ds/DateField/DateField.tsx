'use client';

import React, { forwardRef, useId, useMemo, useRef, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { FieldFrame } from '../FieldFrame';
import { Icon } from '../Icon/Icon';
import { MonthCalendar } from '../MonthCalendar/MonthCalendar';
import { Popover } from '../Popover/Popover';
import { useControllableState } from '../useControllableState';
import { formatDate, parseDateInput } from '../utils';
import { formatDateInput, formatRangeInput } from './dateFormat';

export interface DateRangeValue {
  start?: string;
  end?: string;
}

export interface DateFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'placeholder' | 'type'
  > {
  id?: string;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;

  /** Today ISO string (yyyy-mm-dd) */
  today?: string;

  /** Controlled / uncontrolled open state for calendar popover */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** Single date mode: ISO string (yyyy-mm-dd) or Range object */
  value?: string | DateRangeValue;
  defaultValue?: string | DateRangeValue;
  onValueChange?: (val: string | DateRangeValue) => void;

  /** Range mode: one combined field "dd/mm/yyyy – dd/mm/yyyy" */
  range?: boolean;
  startDate?: string;
  endDate?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  onRangeChange?: (range: { startDate: string; endDate: string }) => void;

  /** Min/Max selectable dates (ISO yyyy-mm-dd) */
  minDate?: string;
  maxDate?: string;
}

export { formatDateInput, formatRangeInput } from './dateFormat';

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
      placeholder,
      today,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      value: controlledValue,
      defaultValue,
      onValueChange,
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

    const [isOpen, setOpen] = useControllableState<boolean>({
      value: controlledOpen,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });

    const isSingleString = typeof controlledValue === 'string';
    const isRangeObject = typeof controlledValue === 'object' && controlledValue !== null;

    // Default placeholder
    const effectivePlaceholder =
      placeholder !== undefined
        ? placeholder
        : range
          ? 'dd/mm/yyyy – dd/mm/yyyy'
          : 'dd/mm/yyyy';

    // Single mode: internal text for typed input
    const initialSingleText = (() => {
      if (typeof controlledValue === 'string') return formatDateInput(controlledValue);
      if (typeof defaultValue === 'string') return formatDateInput(defaultValue);
      return '';
    })();

    const [singleText, setSingleText] = useState(initialSingleText);

    // Sync single text when controlled prop changes
    const [prevControlledValue, setPrevControlledValue] = useState(controlledValue);
    if (controlledValue !== prevControlledValue) {
      setPrevControlledValue(controlledValue);
      if (typeof controlledValue === 'string') {
        setSingleText(formatDateInput(controlledValue));
      }
    }

    // Range mode state
    const initialStartIso = (() => {
      if (isRangeObject && 'start' in controlledValue && controlledValue.start) return controlledValue.start;
      if (controlledStartDate) return controlledStartDate;
      if (defaultValue && typeof defaultValue === 'object' && 'start' in defaultValue && defaultValue.start) return defaultValue.start;
      if (defaultStartDate) return defaultStartDate;
      return '';
    })();

    const initialEndIso = (() => {
      if (isRangeObject && 'end' in controlledValue && controlledValue.end) return controlledValue.end;
      if (controlledEndDate) return controlledEndDate;
      if (defaultValue && typeof defaultValue === 'object' && 'end' in defaultValue && defaultValue.end) return defaultValue.end;
      if (defaultEndDate) return defaultEndDate;
      return '';
    })();

    const [startIso, setStartIso] = useState<string>(initialStartIso);
    const [endIso, setEndIso] = useState<string>(initialEndIso);

    // Derive display text for range input
    const startDisplay = formatDateInput(startIso);
    const endDisplay = formatDateInput(endIso);
    const initialRangeDisplay =
      startDisplay && endDisplay
        ? `${startDisplay} – ${endDisplay}`
        : startDisplay
          ? `${startDisplay} – `
          : '';

    const [rangeText, setRangeText] = useState<string>(initialRangeDisplay);
    const prevRangeInputRef = useRef<string>(initialRangeDisplay);

    const [prevRangeProp, setPrevRangeProp] = useState({
      val: controlledValue,
      start: controlledStartDate,
      end: controlledEndDate,
    });
    if (
      controlledValue !== prevRangeProp.val ||
      controlledStartDate !== prevRangeProp.start ||
      controlledEndDate !== prevRangeProp.end
    ) {
      setPrevRangeProp({
        val: controlledValue,
        start: controlledStartDate,
        end: controlledEndDate,
      });
      if (
        controlledValue !== undefined ||
        controlledStartDate !== undefined ||
        controlledEndDate !== undefined
      ) {
        const s =
          isRangeObject && controlledValue.start
            ? controlledValue.start
            : controlledStartDate ?? '';
        const e =
          isRangeObject && controlledValue.end
            ? controlledValue.end
            : controlledEndDate ?? '';
        setStartIso(s);
        setEndIso(e);
        const sDisp = formatDateInput(s);
        const eDisp = formatDateInput(e);
        const disp =
          sDisp && eDisp ? `${sDisp} – ${eDisp}` : sDisp ? `${sDisp} – ` : '';
        setRangeText(disp);
      }
    }

    // Calendar view state (visible month ISO yyyy-mm-01)
    const initialMonthIso = useMemo(() => {
      const candidate = startIso || singleText ? parseDateInput(singleText) : null;
      if (candidate) return `${candidate.slice(0, 7)}-01`;
      if (today) return `${today.slice(0, 7)}-01`;
      return '2026-10-01';
    }, [startIso, singleText, today]);

    const [viewMonthIso, setViewMonthIso] = useState<string>(initialMonthIso);

    // 0 = next click sets start, 1 = next click sets end
    const [rangeStep, setRangeStep] = useState<0 | 1>(0);

    const hasError = Boolean(error);

    const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDateInput(e.target.value);
      setSingleText(formatted);
      const iso = parseDateInput(formatted);
      if (iso) {
        onValueChange?.(iso);
      }
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
      setRangeText(formatted.display);

      const sIso = parseDateInput(formatted.startDate);
      const eIso = parseDateInput(formatted.endDate);
      if (sIso) setStartIso(sIso);
      if (eIso) setEndIso(eIso);

      if (sIso && eIso) {
        onValueChange?.({ start: sIso, end: eIso });
        onRangeChange?.({
          startDate: formatted.startDate,
          endDate: formatted.endDate,
        });
      }
    };

    const handleSelectDateFromCalendar = (isoDate: string) => {
      if (!range) {
        setSingleText(formatDate(isoDate, 'input'));
        onValueChange?.(isoDate);
        setOpen(false);
      } else {
        if (rangeStep === 0 || (startIso && endIso)) {
          // First click: sets start date
          setStartIso(isoDate);
          setEndIso('');
          const disp = `${formatDate(isoDate, 'input')} – `;
          setRangeText(disp);
          prevRangeInputRef.current = disp;
          setRangeStep(1);
          onRangeChange?.({ startDate: formatDate(isoDate, 'input'), endDate: '' });
        } else {
          // Second click: sets end date
          let finalStart = startIso;
          let finalEnd = isoDate;
          if (isoDate < startIso) {
            finalStart = isoDate;
            finalEnd = startIso;
          }
          setStartIso(finalStart);
          setEndIso(finalEnd);
          const disp = `${formatDate(finalStart, 'input')} – ${formatDate(finalEnd, 'input')}`;
          setRangeText(disp);
          prevRangeInputRef.current = disp;
          setRangeStep(0);
          onValueChange?.({ start: finalStart, end: finalEnd });
          onRangeChange?.({
            startDate: formatDate(finalStart, 'input'),
            endDate: formatDate(finalEnd, 'input'),
          });
          setOpen(false);
        }
      }
    };

    const handleToday = () => {
      if (!today) return;
      if (!range) {
        setSingleText(formatDate(today, 'input'));
        onValueChange?.(today);
        setOpen(false);
      } else {
        setStartIso(today);
        setEndIso('');
        const disp = `${formatDate(today, 'input')} – `;
        setRangeText(disp);
        prevRangeInputRef.current = disp;
        setRangeStep(1);
        onRangeChange?.({ startDate: formatDate(today, 'input'), endDate: '' });
      }
    };

    const handleClear = () => {
      if (!range) {
        setSingleText('');
        onValueChange?.('');
        setOpen(false);
      } else {
        setStartIso('');
        setEndIso('');
        setRangeText('');
        prevRangeInputRef.current = '';
        setRangeStep(0);
        onValueChange?.({ start: '', end: '' });
        onRangeChange?.({ startDate: '', endDate: '' });
        setOpen(false);
      }
    };

    // Calculate next month ISO for range view
    const nextMonthIso = useMemo(() => {
      const match = viewMonthIso.match(/^(\d{4})-(\d{2})/);
      if (!match) return '2026-11-01';
      let y = parseInt(match[1], 10);
      let m = parseInt(match[2], 10); // 1-based next month
      if (m > 11) {
        m = 0;
        y += 1;
      }
      return `${y}-${String(m + 1).padStart(2, '0')}-01`;
    }, [viewMonthIso]);

    // Calendar content: two months side by side on desktop in range mode, one month on phone or in single mode
    const calendarContent = range ? (
      <div className="flex flex-col bg-surface">
        <div className="flex flex-row divide-x divide-line-soft">
          <MonthCalendar
            mode="picker"
            range
            month={viewMonthIso}
            onMonthChange={setViewMonthIso}
            value={{ start: startIso, end: endIso }}
            minDate={minDate}
            maxDate={maxDate}
            today={today}
            onValueChange={(val) => {
              if (val && typeof val === 'object') {
                if (val.start && !val.end) {
                  handleSelectDateFromCalendar(val.start);
                } else if (val.start && val.end) {
                  handleSelectDateFromCalendar(val.end);
                }
              }
            }}
          />
          <div className="hidden lg:block">
            <MonthCalendar
              mode="picker"
              range
              month={nextMonthIso}
              onMonthChange={(iso: string) => {
                const match = iso.match(/^(\d{4})-(\d{2})/);
                if (match) {
                  let y = parseInt(match[1], 10);
                  let m = parseInt(match[2], 10) - 1; // 1-based to 0-based
                  if (m < 1) {
                    m = 12;
                    y -= 1;
                  }
                  setViewMonthIso(`${y}-${String(m).padStart(2, '0')}-01`);
                }
              }}
              value={{ start: startIso, end: endIso }}
              minDate={minDate}
              maxDate={maxDate}
              today={today}
              onValueChange={(val) => {
                if (val && typeof val === 'object') {
                  if (val.start && !val.end) {
                    handleSelectDateFromCalendar(val.start);
                  } else if (val.start && val.end) {
                    handleSelectDateFromCalendar(val.end);
                  }
                }
              }}
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
        month={viewMonthIso}
        onMonthChange={setViewMonthIso}
        value={isSingleString ? controlledValue : parseDateInput(singleText) ?? undefined}
        minDate={minDate}
        maxDate={maxDate}
        today={today}
        onValueChange={(val) => {
          if (typeof val === 'string') {
            handleSelectDateFromCalendar(val);
          }
        }}
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
            placeholder={effectivePlaceholder}
            value={range ? rangeText : singleText}
            onChange={range ? handleRangeInputChange : handleSingleInputChange}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={hasError || helper ? helperId : undefined}
            className={cn(
              'w-full h-full bg-transparent border-0 p-0 text-body text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0',
              disabled && 'cursor-not-allowed text-ink-faint',
            )}
            {...props}
          />

          <Popover
            open={isOpen}
            onOpenChange={setOpen}
            trigger={triggerButton}
            align="end"
            contentClassName={cn(
              'p-0 overflow-hidden shadow-level-2',
              range ? 'max-w-container-md w-auto' : '',
            )}
          >
            {calendarContent}
          </Popover>
        </div>
      </FieldFrame>
    );
  },
);

DateField.displayName = 'DateField';
