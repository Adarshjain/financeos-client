import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: string | number | undefined): string {
  if (amount === undefined || amount === null) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getAccountTypeLabel(type: string | undefined): string {
  if (!type) return 'Unknown';
  const labels: Record<string, string> = {
    bank_account: 'Bank Account',
    credit_card: 'Credit Card',
    stock: 'Stock',
    mutual_fund: 'Mutual Fund',
    generic: 'Generic',
    checking: 'Checking',
    savings: 'Savings',
    investment: 'Investment',
    loan: 'Loan',
    other: 'Other',
  };
  return labels[type.toLowerCase()] || type;
}

export function getPositionLabel(position: string | undefined): string {
  if (!position) return 'Asset';
  return position === 'liability' ? 'Liability' : 'Asset';
}

export function getMonthShortName(input: number | Date, locale = 'en-IN'): string {
  let monthIndex;

  if (input instanceof Date) {
    monthIndex = input.getMonth(); // 0–11
  } else if (Number.isInteger(input) && input >= 0 && input <= 11) {
    monthIndex = input;
  } else {
    return '-'; // invalid input
  }

  return new Date(2000, monthIndex, 1)
    .toLocaleString(locale, { month: 'short' });
}

export function getDayShortName(input: number | Date, locale = 'en-IN') {
  let dayIndex;

  if (input instanceof Date) {
    dayIndex = input.getDay(); // 0–6
  } else if (Number.isInteger(input) && input >= 0 && input <= 6) {
    dayIndex = input;
  } else {
    return null;
  }

  return new Date(2000, 0, 2 + dayIndex) // Sunday-based reference
    .toLocaleString(locale, { weekday: 'short' });
}

export function formatMonthYear(date: Date, locale = 'en-IN') {
  const month = date.toLocaleString(locale, { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);

  return `${month} ${year}`;
}

export function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isWithinLastNDays(date: Date, days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffInDays = (+today - +target) / (1000 * 60 * 60 * 24);

  return diffInDays >= 0 && diffInDays < days;
}
