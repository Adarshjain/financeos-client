import { parseDateInput } from '../utils';

/**
 * Formats a typed raw input or ISO string into a display dd/mm/yyyy string (an ISO date always shows a four-digit year).
 */
export function formatDateInput(val?: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return `${val.slice(8, 10)}/${val.slice(5, 7)}/${val.slice(0, 4)}`;
  }
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Masks up to 8 typed digits as dd/mm/yyyy (a two-digit year stays dd/mm/yy until it is expanded on blur). */
function maskDate(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** A typed date is complete with a four-digit year; a two-digit year is expanded on blur (see `expandTwoDigitYear`). */
const isCompleteDigits = (digits: string) => digits.length === 8;

/**
 * Expands a complete dd/mm/yy to dd/mm/yyyy, reading it as 20yy; with a `maxDate`, a 20yy after it reads as 19yy.
 * Anything else comes back unchanged.
 */
export function expandTwoDigitYear(text: string, maxDate?: string): string {
  const m = text.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{2})\s*$/);
  if (!m) return text;
  const dayMonth = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}`;
  const iso = parseDateInput(`${dayMonth}/20${m[3]}`);
  if (!iso) return text;
  if (maxDate && iso > maxDate) {
    const earlier = parseDateInput(`${dayMonth}/19${m[3]}`);
    if (earlier) return formatDateInput(earlier);
  }
  return formatDateInput(iso);
}

/** `expandTwoDigitYear` for each side of a "dd/mm/yy – dd/mm/yy" range text. */
export function expandRangeTwoDigitYears(text: string, maxDate?: string): string {
  const sides = text.split(' – ');
  if (sides.length < 2) return expandTwoDigitYear(text, maxDate);
  return sides.map((side) => expandTwoDigitYear(side, maxDate)).join(' – ');
}

/**
 * Formats a raw range input into display "dd/mm/yyyy – dd/mm/yyyy".
 * Digits only: the start is the first 8 digits (dd/mm/yyyy) and " – " is inserted after it. A start typed or pasted
 * with a two-digit year and an explicit dash ("13/10/26 – ...") is kept as typed and expanded on blur.
 */
export function formatRangeInput(val?: string): {
  display: string;
  startDate: string;
  endDate: string;
} {
  if (!val) return { display: '', startDate: '', endDate: '' };

  const sides = val.split(/[–-]/);
  let startDigits: string;
  let endDigits: string;
  let startDone: boolean;
  const firstSideDigits = sides[0].replace(/\D/g, '').slice(0, 8);
  if (sides.length > 1 && (isCompleteDigits(firstSideDigits) || firstSideDigits.length === 6)) {
    startDigits = sides[0].replace(/\D/g, '').slice(0, 8);
    endDigits = sides[1].replace(/\D/g, '').slice(0, 8);
    startDone = true;
  } else {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const startLen = 8;
    startDigits = digits.slice(0, startLen);
    endDigits = digits.slice(startLen, startLen + 8);
    startDone = startDigits.length === startLen;
  }

  const startFormatted = maskDate(startDigits);
  const endFormatted = startDone ? maskDate(endDigits) : '';

  let display = startFormatted;
  if (startDone) {
    display = endFormatted ? `${startFormatted} – ${endFormatted}` : `${startFormatted} – `;
  }

  return {
    display,
    startDate: startDone ? startFormatted : '',
    endDate: startDone && isCompleteDigits(endDigits) ? endFormatted : '',
  };
}

/**
 * Checks if a typed dd/mm/yy or dd/mm/yyyy string is a valid complete date.
 * Returns the ISO yyyy-mm-dd string if valid, otherwise null.
 */
export function isValidDateInput(val?: string): string | null {
  if (!val) return null;
  return parseDateInput(val);
}
