import type { NotificationSettingsResponse } from '@/lib/api/types';

export interface KindOption {
  key: string;
  label: string;
  description: string;
}

export interface KindGroup {
  title: string;
  kinds: KindOption[];
}

/** The user-facing switches, grouped by module, in display order. Keys match the server's NotificationKind. */
export const KIND_GROUPS: KindGroup[] = [
  {
    title: 'Credit cards',
    kinds: [
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
    ],
  },
  {
    title: 'Loans',
    kinds: [
      {
        key: 'EMI_DUE_REMINDER',
        label: 'EMI reminders',
        description: 'Before each EMI debits, at the same offsets as card bills.',
      },
      {
        key: 'EMI_OVERDUE',
        label: 'EMI overdue',
        description: 'Once when an EMI passes its date with no payment recorded, then weekly.',
      },
    ],
  },
  {
    title: 'Gmail',
    kinds: [
      {
        key: 'GMAIL_RECONNECT',
        label: 'Mailbox disconnected',
        description: 'When Google stops accepting a connected mailbox and it needs reconnecting. Weekly while it stays down.',
      },
      {
        key: 'GMAIL_ATTENTION',
        label: 'Emails needing attention',
        description: 'A daily digest of imported emails that could not be matched to an account or failed to import.',
      },
    ],
  },
];

/** Flat list of every switch (the order the groups render in). */
export const KIND_OPTIONS: KindOption[] = KIND_GROUPS.flatMap((g) => g.kinds);

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
