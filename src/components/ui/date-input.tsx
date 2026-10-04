'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, parseCalendarDate, toCalendarDate } from '@/lib/utils';

/*
 * Drop-in replacement for <input type="date">. The native control renders in
 * the browser/OS locale (mm/dd/yyyy on most en-US setups) and HTML offers no
 * way to override that, so this shows dd/mm/yyyy text with a calendar popover
 * while keeping the native contract: value/defaultValue/onChange speak ISO
 * YYYY-MM-DD, '' while the text is empty or not yet a valid date, and `name`
 * submits the ISO value through a hidden input.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function buildIso(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  // Rejects rollovers such as 31/02 → 03/03.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return '';
  return toCalendarDate(d);
}

/** dd/mm/yyyy → YYYY-MM-DD, or '' when incomplete or not a real date. */
export function displayToIso(text: string): string {
  const m = DISPLAY_DATE.exec(text);
  if (!m) return '';
  return buildIso(Number(m[3]), Number(m[2]), Number(m[1]));
}

/** YYYY-MM-DD → dd/mm/yyyy, or '' for anything else. */
export function isoToDisplay(iso: string | undefined | null): string {
  const m = iso ? ISO_DATE.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/**
 * Normalises raw keystrokes/pastes into dd/mm/yyyy: digits get slashes
 * inserted as the next segment starts, a separator after a single digit pads
 * it ("1/" → "01/"), and a pasted ISO date is converted outright.
 */
export function formatTypedDate(raw: string): string {
  const iso = ISO_DATE.exec(raw.trim());
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const maxLen = [2, 2, 4];
  let out = '';
  let seg = '';
  let segIdx = 0;
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      if (seg.length === maxLen[segIdx]) {
        if (segIdx === 2) break;
        out += `${seg}/`;
        segIdx++;
        seg = '';
      }
      seg += ch;
    } else if (segIdx < 2 && seg.length > 0) {
      out += `${seg.padStart(2, '0')}/`;
      segIdx++;
      seg = '';
    }
  }
  return out + seg;
}

export type DateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'
> & {
  /** ISO YYYY-MM-DD ('' = empty). */
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  /** Receives the ISO value at `e.target.value`, exactly like a native date input. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, defaultValue, onChange, name, min, max, className, disabled, id, ...rest }, ref) => {
    const isControlled = value !== undefined;
    const [innerIso, setInnerIso] = React.useState(defaultValue ?? '');
    const iso = isControlled ? value : innerIso;

    const [text, setText] = React.useState(() => isoToDisplay(iso));
    const [open, setOpen] = React.useState(false);
    const hiddenRef = React.useRef<HTMLInputElement>(null);
    const textRef = React.useRef<HTMLInputElement | null>(null);

    // An outside value change (form reset, prefill) replaces the text. A
    // half-typed date parses to '' just like the value it emitted, so it
    // survives re-renders instead of being wiped mid-keystroke.
    if (displayToIso(text) !== iso) {
      setText(isoToDisplay(iso));
    }

    const emit = (next: string) => {
      if (!isControlled) setInnerIso(next);
      if (next === iso) return;
      if (hiddenRef.current) hiddenRef.current.value = next;
      // A snapshot, not the live element: a controlled parent re-render resets
      // the hidden input, and a deferred reader (state updater) would see that.
      const target = { value: next, name: name ?? '', id: id ?? '' } as HTMLInputElement;
      onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>);
    };

    const outOfRange = (d: string) => Boolean(d && ((min && d < min) || (max && d > max)));

    const parsed = displayToIso(text);
    let validity = '';
    if (text && !parsed) validity = 'Enter a valid date as dd/mm/yyyy';
    else if (outOfRange(parsed)) {
      validity = min && parsed < min
        ? `Date must be on or after ${isoToDisplay(min)}`
        : `Date must be on or before ${isoToDisplay(max)}`;
    }

    React.useEffect(() => {
      textRef.current?.setCustomValidity(validity);
    }, [validity]);

    const setRefs = (el: HTMLInputElement | null) => {
      textRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    };

    return (
      <div className="relative w-full">
        <input
          {...rest}
          ref={setRefs}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          maxLength={10}
          data-slot="date-input"
          disabled={disabled}
          value={text}
          onChange={(e) => {
            const next = formatTypedDate(e.target.value);
            setText(next);
            emit(displayToIso(next));
          }}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className,
            'pr-8 tabular-nums',
          )}
        />
        <input type="hidden" ref={hiddenRef} name={name} value={iso} />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Open calendar"
              disabled={disabled}
              className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center h-6 w-6 rounded text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={iso ? parseCalendarDate(iso) : undefined}
              defaultMonth={iso ? parseCalendarDate(iso) : undefined}
              captionLayout="dropdown"
              disabled={[
                ...(min ? [{ before: parseCalendarDate(min) }] : []),
                ...(max ? [{ after: parseCalendarDate(max) }] : []),
              ]}
              onSelect={(d: Date | undefined) => {
                setOpen(false);
                if (!d) return;
                const next = toCalendarDate(d);
                setText(isoToDisplay(next));
                emit(next);
                textRef.current?.focus();
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);
DateInput.displayName = 'DateInput';
