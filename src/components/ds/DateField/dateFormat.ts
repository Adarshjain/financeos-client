import { formatDate } from '@/lib/format';

import { parseDateInput } from '../utils';

/**
 * Formats a typed raw input or ISO string into a display dd/mm/yy string.
 */
export function formatDateInput(val?: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return formatDate(val, 'input');
  }
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Masks up to 8 typed digits as dd/mm/yy or dd/mm/yyyy. */
function maskDate(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** A typed date is complete with a two-digit or a four-digit year. */
const isCompleteDigits = (digits: string) => digits.length === 6 || digits.length === 8;

/**
 * Formats a raw range input into display "dd/mm/yy – dd/mm/yy" (four-digit years also accepted with separators).
 * Digits only: the start is the first 6 digits (dd/mm/yy) and " – " is inserted after it. A start typed or pasted
 * with a four-digit year ("13/10/2026") keeps its 8 digits.
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
  if (sides.length > 1 && isCompleteDigits(sides[0].replace(/\D/g, '').slice(0, 8))) {
    startDigits = sides[0].replace(/\D/g, '').slice(0, 8);
    endDigits = sides[1].replace(/\D/g, '').slice(0, 8);
    startDone = true;
  } else {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const startLen = /^\s*\d{1,2}\/\d{1,2}\/\d{4}/.test(val) ? 8 : 6;
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
