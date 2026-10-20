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
      {
        key: 'STATEMENT_EXPECTED',
        label: 'Statement missing',
        description: 'When a card\u2019s next statement is a few days past its usual closing day and has not arrived.',
      },
    ],
  },
  {
    title: 'Transactions',
    kinds: [
      {
        key: 'STATEMENT_REVIEW_DIGEST',
        label: 'Unreconciled after a statement',
        description: 'Once per parsed statement, if transactions in its period still need review. Card statements include the bill.',
      },
    ],
  },
  {
    title: 'Loans and lendings',
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
      {
        key: 'LENDING_RETURN',
        label: 'Money due back',
        description: 'On the day money you lent or borrowed is expected back, once when it is late, then weekly.',
      },
    ],
  },
  {
    title: 'Rewards',
    kinds: [
      {
        key: 'REWARD_MILESTONE',
        label: 'Milestones',
        description: 'A milestone within reach as its window closes, and every milestone you unlock.',
      },
      {
        key: 'REWARD_CAP',
        label: 'Caps reached',
        description: 'When a rule or shared cap is used up for its period, so you can switch cards.',
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
  {
    title: 'Imports and jobs',
    kinds: [
      {
        key: 'JOB_FINISHED',
        label: 'Import finished or failed',
        description: 'When a statement import, investment import, reconciliation or rule apply you started finishes. Silent while the app is open.',
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
