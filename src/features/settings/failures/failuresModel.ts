import type { Schemas } from '@/lib/api/types';
import { istParts } from '@/lib/format/date';
import { formatTime } from '@/lib/format/time';

export type FailedEmail = Schemas['FailedGmailItemResponse'];
export type FailedJob = Schemas['FailedJobResponse'];
export type FailureSummary = Schemas['FailureSummaryResponse'];
export type RetryAllResult = Schemas['RetryAllResponse'];
export type FailureKind = 'gmail' | 'jobs';
export type EmailFilter = 'failed' | 'skipped';

export const FAILURES_PAGE_SIZE = 20;
/** The server stops retrying an email after this many tries. */
export const MAX_EMAIL_ATTEMPTS = 5;
export const MAX_REASON_LENGTH = 500;
export const STALE_MESSAGE = 'This item is no longer failed. The list was refreshed.';

export const EMAIL_FILTER_OPTIONS: { value: EmailFilter; label: string }[] = [
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
];

/** The ledger status to ask for; undefined means both FAILED_* statuses. */
export function emailStatusParam(filter: EmailFilter): 'SKIPPED_BY_ADMIN' | undefined {
  return filter === 'skipped' ? 'SKIPPED_BY_ADMIN' : undefined;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 emails retrying · 1 email failed · 2 jobs failed", or the all-clear line. */
export function countsLine(s: FailureSummary): string {
  const parts: string[] = [];
  if (s.failedGmailRetryable > 0) parts.push(`${plural(s.failedGmailRetryable, 'email', 'emails')} retrying`);
  if (s.failedGmailPermanent > 0) parts.push(`${plural(s.failedGmailPermanent, 'email', 'emails')} failed`);
  if (s.failedJobs > 0) parts.push(`${plural(s.failedJobs, 'job', 'jobs')} failed`);
  return parts.length > 0 ? parts.join(' · ') : 'Nothing has failed in the last 30 days.';
}

/** dd/mm/yyyy in IST; empty when missing. */
export function ddmmyyyy(at: string | null | undefined): string {
  if (!at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const { ymd } = istParts(d);
  return `${String(ymd.d).padStart(2, '0')}/${String(ymd.m).padStart(2, '0')}/${ymd.y}`;
}

/** "13/10/2026, 3:30 pm" (IST); empty when missing. */
export function dateTime12(at: string | null | undefined): string {
  const date = ddmmyyyy(at);
  return date ? `${date}, ${formatTime(at)}` : '';
}

/** The first non-empty line of an error, trimmed. */
export function firstLine(text: string | null | undefined): string {
  return (text ?? '').split('\n').map((l) => l.trim()).find((l) => l !== '') ?? '';
}

/** "Retrying, try 2 of 5", "Failed" or "Skipped". */
export function emailStatusLabel(item: Pick<FailedEmail, 'status' | 'attemptCount'>): string {
  if (item.status === 'FAILED_RETRYABLE') return `Retrying, try ${item.attemptCount} of ${MAX_EMAIL_ATTEMPTS}`;
  if (item.status === 'SKIPPED_BY_ADMIN') return 'Skipped';
  return 'Failed';
}

export function emailTitle(item: Pick<FailedEmail, 'subject' | 'sender'>): string {
  return item.subject?.trim() || item.sender?.trim() || '(no subject)';
}

/** user · sender · email date · status · next retry. */
export function emailSecondary(item: FailedEmail): string {
  const parts = [item.userEmail, item.sender, ddmmyyyy(item.internalDate), emailStatusLabel(item)];
  if (item.status === 'FAILED_RETRYABLE' && item.nextRetryAt) parts.push(`next try ${dateTime12(item.nextRetryAt)}`);
  return parts.filter((p) => p).join(' · ');
}

/** user · finished at, plus why a job can't be retried. */
export function jobSecondary(job: FailedJob): string {
  const parts = [job.userEmail, dateTime12(job.finishedAt)];
  if (!job.retryable && !job.dismissedAt) parts.push("Can't retry: files expired");
  if (job.dismissedAt) parts.push('Dismissed');
  return parts.filter((p) => p).join(' · ');
}

export function openInGmailUrl(item: Pick<FailedEmail, 'connectionEmail' | 'gmailMessageId'>): string {
  return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(item.connectionEmail)}#all/${item.gmailMessageId}`;
}

/** How many items "Retry all" will touch on this tab. */
export function retryAllCount(kind: FailureKind, s: FailureSummary): number {
  return kind === 'gmail' ? s.failedGmailRetryable + s.failedGmailPermanent : s.failedJobs;
}

export function retryAllQuestion(kind: FailureKind, count: number): string {
  return `Retry all ${plural(count, kind === 'gmail' ? 'failed email' : 'failed job', kind === 'gmail' ? 'failed emails' : 'failed jobs')}?`;
}

export function retryAllToast(kind: FailureKind, r: RetryAllResult): string {
  if (kind === 'gmail') {
    return `Retrying ${plural(r.affected, 'email', 'emails')} (${plural(r.jobsEnqueued, 'sync', 'syncs')} queued)`;
  }
  const skipped = r.skipped > 0 ? `, ${r.skipped} skipped (files expired)` : '';
  return `Retried ${plural(r.affected, 'job', 'jobs')}${skipped}`;
}

export const failureKeys = {
  all: ['failures'] as const,
  summary: () => [...failureKeys.all, 'summary'] as const,
  emails: (filter: EmailFilter, page: number) => [...failureKeys.all, 'emails', filter, page] as const,
  jobs: (includeDismissed: boolean, page: number) => [...failureKeys.all, 'jobs', includeDismissed, page] as const,
};

/** A row's own click. A ⋯ menu item inside the row bubbles its click through the React tree (the menu is a portal): ignore those. */
export function openFromRow(e: { currentTarget: Element; target: EventTarget }, open: () => void): void {
  if (e.currentTarget.contains(e.target as Node)) open();
}
