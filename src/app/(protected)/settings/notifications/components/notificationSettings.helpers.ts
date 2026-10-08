import type { NotificationSettingsResponse } from '@/lib/api/types';

/** The user-facing switches, in display order. Keys match the server's NotificationKind. */
export const KIND_OPTIONS: { key: string; label: string; description: string }[] = [
  {
    key: 'STATEMENT_RECEIVED',
    label: 'Statement digest',
    description: 'When a new card statement lands: total and minimum due, due date, spend, charges and points.',
  },
  {
    key: 'BILL_DUE_REMINDER',
    label: 'Due reminders',
    description: 'Before the due date, at the offsets below.',
  },
  {
    key: 'BILL_OVERDUE',
    label: 'Overdue nags',
    description: 'Every day after the due date until the bill is marked paid.',
  },
];

/** Offsets offered as toggles; any stored value outside this list is still shown. */
export const OFFSET_CHOICES = [14, 7, 5, 3, 2, 1, 0];

export function offsetLabel(offset: number): string {
  if (offset === 0) return 'On the day';
  if (offset === 1) return '1 day before';
  return `${offset} days before`;
}

export function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${hour < 12 ? 'am' : 'pm'}`;
}

export function toggleOffset(current: number[], offset: number): number[] {
  const next = current.includes(offset) ? current.filter((o) => o !== offset) : [...current, offset];
  return [...new Set(next)].sort((a, b) => b - a);
}

export function isKindEnabled(settings: NotificationSettingsResponse, key: string): boolean {
  const value = settings.kinds?.[key];
  return value !== false;
}

export function isThisDevice(endpoint: string, currentEndpoint: string | null): boolean {
  return currentEndpoint != null && endpoint === currentEndpoint;
}
