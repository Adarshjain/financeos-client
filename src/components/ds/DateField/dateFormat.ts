import { formatDate, parseDateInput } from '../utils';

/**
 * Formats a typed raw input or ISO string into a display dd/mm/yyyy string.
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

/**
 * Formats a raw range input into display "dd/mm/yyyy – dd/mm/yyyy".
 */
export function formatRangeInput(val?: string): {
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

/**
 * Checks if a typed dd/mm/yyyy string is a valid complete date.
 * Returns the ISO yyyy-mm-dd string if valid, otherwise null.
 */
export function isValidDateInput(val?: string): string | null {
  if (!val) return null;
  return parseDateInput(val);
}
