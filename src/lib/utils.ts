import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
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
