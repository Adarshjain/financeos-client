import type { GmailProcessedStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';

/** Plain-language outcome of one email in a sync run. */
export const STATUS_LABELS: Record<GmailProcessedStatus, string> = {
  DISCOVERED: 'Queued',
  PROCESSING: 'Processing',
  CREATED: 'Transaction created',
  RECONCILED: 'Statement reconciled',
  SKIPPED_NOT_TRANSACTION: 'Not a transaction',
  SKIPPED_BEFORE_WATERMARK: "Before the account's ingest-from date",
  SKIPPED_SENDER_DISABLED: 'Sender not enabled',
  SKIPPED_DUPLICATE: 'Already imported',
  SKIPPED_MESSAGE_GONE: 'Deleted in Gmail',
  UNRESOLVED_ACCOUNT: 'No matching account',
  ACCOUNT_NOT_OPTED_IN: 'Account not opted in',
  FAILED_RETRYABLE: 'Failed, will retry',
  FAILED_PERMANENT: 'Failed',
  CLEANED_UP: 'Cleaned up',
};

export const SKIPPED_STATUSES: GmailProcessedStatus[] = [
  'SKIPPED_NOT_TRANSACTION',
  'SKIPPED_BEFORE_WATERMARK',
  'SKIPPED_SENDER_DISABLED',
  'SKIPPED_DUPLICATE',
  'SKIPPED_MESSAGE_GONE',
];

export const PARKED_STATUSES: GmailProcessedStatus[] = ['UNRESOLVED_ACCOUNT', 'ACCOUNT_NOT_OPTED_IN'];

export const FAILED_STATUSES: GmailProcessedStatus[] = ['FAILED_PERMANENT', 'FAILED_RETRYABLE'];

export interface MessageGroup {
  key: string;
  title: string;
  statuses: GmailProcessedStatus[];
  /** Groups the user has to act on start open. */
  defaultOpen: boolean;
}

/** Display order of the per-email list: problems first. Unlisted statuses fall into "Other". */
export const MESSAGE_GROUPS: MessageGroup[] = [
  { key: 'failed', title: 'Failed', statuses: FAILED_STATUSES, defaultOpen: true },
  { key: 'parked', title: 'Parked', statuses: PARKED_STATUSES, defaultOpen: true },
  { key: 'created', title: 'Created', statuses: ['CREATED'], defaultOpen: false },
  { key: 'reconciled', title: 'Statements reconciled', statuses: ['RECONCILED'], defaultOpen: false },
  { key: 'skipped', title: 'Skipped', statuses: SKIPPED_STATUSES, defaultOpen: false },
];

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

/** "Not a transaction 3 · Already imported 1" for the statuses that occurred; empty when none did. */
export function describeCounts(
  counts: Partial<Record<GmailProcessedStatus, number>>,
  statuses: GmailProcessedStatus[],
): string {
  return statuses
    .filter((s) => (counts[s] ?? 0) > 0)
    .map((s) => `${STATUS_LABELS[s]} ${counts[s]}`)
    .join(' · ');
}
