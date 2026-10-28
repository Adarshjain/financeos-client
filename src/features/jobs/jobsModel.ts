import { todayInAppZone } from '@/lib/date-range';
import { formatCount, formatDate, formatTime } from '@/lib/format';
import type {
  FileIngestionResult,
  ImportCommitResult,
  JobResponse,
  JobType,
  PriceRefreshResult,
  RuleApplyResult,
  SyncSummary,
} from '@/lib/types';

import { isActiveJob } from './jobModel';

export const TYPE_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Statement ingest', value: 'STATEMENT_INGEST' },
  { label: 'Gmail sync', value: 'GMAIL_SYNC' },
  { label: 'Price refresh', value: 'PRICE_REFRESH' },
  { label: 'Import commit', value: 'INVESTMENT_IMPORT_COMMIT' },
  { label: 'Reconcile commit', value: 'BROKER_RECONCILE_COMMIT' },
  { label: 'Rule apply', value: 'RULE_APPLY' },
];

export function typeLabel(type: JobType): string {
  return TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

/** "today 14:06", "yesterday 18:12", "1 Oct 21:40". */
export function startedLabel(createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '—';
  const day = todayInAppZone(created);
  if (day === todayInAppZone(now)) return `today ${formatTime(created)}`;
  if (day === todayInAppZone(new Date(now.getTime() - 86_400_000))) return `yesterday ${formatTime(created)}`;
  return `${formatDate(created, 'list', { today: todayInAppZone(now) })} ${formatTime(created)}`;
}

/** "6.1 s" under a minute, "2 m 5 s" above, "—" while the job has no start or end. */
export function tookLabel(startedAt?: string | null, finishedAt?: string | null): string {
  if (!startedAt || !finishedAt) return '—';
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return '—';
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const sec = Math.round(ms / 1000);
  return `${Math.floor(sec / 60)} m ${sec % 60} s`;
}

function asRecord(result: unknown): Record<string, unknown> | null {
  return result && typeof result === 'object' ? (result as Record<string, unknown>) : null;
}

/** What the job worked on, when its result says: mailbox, file name, instruments, rule. Null otherwise. */
export function jobSubject(job: Pick<JobResponse, 'type' | 'result'>): string | null {
  if (!asRecord(job.result)) return null;
  switch (job.type) {
    case 'GMAIL_SYNC':
      return (job.result as SyncSummary).mailbox || null;
    case 'STATEMENT_INGEST': {
      const r = job.result as FileIngestionResult;
      const files = r.fileDetails ?? [];
      if (files.length === 1) return files[0].filename || null;
      const count = files.length || r.filesProcessed || 0;
      return count > 1 ? formatCount(count, 'files') : null;
    }
    case 'PRICE_REFRESH': {
      const r = job.result as PriceRefreshResult;
      const total = (r.refreshed ?? 0) + (r.skipped ?? 0) + (Array.isArray(r.failed) ? r.failed.length : 0);
      return total > 0 ? formatCount(total, ['instrument', 'instruments']) : null;
    }
    case 'RULE_APPLY': {
      const r = job.result as RuleApplyResult;
      return r.ruleName || r.pattern || null;
    }
    default:
      return null;
  }
}

/** One line of what a finished job did, from its result. Null when there is no result to read. */
export function jobSummary(job: Pick<JobResponse, 'type' | 'result'>): string | null {
  if (!asRecord(job.result)) return null;
  switch (job.type) {
    case 'GMAIL_SYNC': {
      const r = job.result as SyncSummary;
      const emails = r.processed ?? r.fetched ?? (r.created ?? 0) + (r.reconciled ?? 0) + (r.skipped ?? 0);
      const attention = (r.parked ?? 0) + (r.failedPermanent ?? r.failed ?? 0) + (r.failedRetryable ?? 0);
      return [
        formatCount(emails, ['email', 'emails']),
        formatCount(r.created ?? 0, ['transaction', 'transactions']),
        attention > 0 ? `${attention} ${attention === 1 ? 'needs' : 'need'} attention` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'STATEMENT_INGEST': {
      const r = job.result as FileIngestionResult;
      const files = r.fileDetails ?? [];
      const rows = files.reduce((sum, f) => sum + (f.linesParsed ?? 0), 0);
      const failedFiles = files.filter((f) => f.status === 'FAILED').length;
      return [
        formatCount(rows, ['row', 'rows']),
        formatCount(r.totalCreated ?? 0, 'new'),
        r.totalDuplicatesFound > 0 ? formatCount(r.totalDuplicatesFound, ['duplicate', 'duplicates']) : null,
        failedFiles > 0 ? formatCount(failedFiles, 'failed') : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'PRICE_REFRESH': {
      const r = job.result as PriceRefreshResult;
      const failed = Array.isArray(r.failed) ? r.failed.length : 0;
      return [
        formatCount(r.refreshed ?? 0, 'updated'),
        (r.skipped ?? 0) > 0 ? formatCount(r.skipped, 'skipped') : null,
        failed > 0 ? formatCount(failed, 'failed') : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'INVESTMENT_IMPORT_COMMIT':
    case 'BROKER_RECONCILE_COMMIT': {
      const r = job.result as ImportCommitResult;
      const failed = Array.isArray(r.failed) ? r.failed.length : 0;
      return [
        `${r.committed ?? 0} imported`,
        (r.skipped ?? 0) > 0 ? formatCount(r.skipped, 'skipped') : null,
        failed > 0 ? formatCount(failed, 'failed') : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'RULE_APPLY': {
      const r = job.result as RuleApplyResult;
      const left = (r.skippedManuallyReviewed ?? 0) + (r.skippedNoLongerMatching ?? 0) + (r.notFound ?? 0);
      return [`${r.appliedCount ?? 0} updated`, left > 0 ? `${left} left unchanged` : null].filter(Boolean).join(' · ');
    }
    default:
      return null;
  }
}

export type ResultCellModel =
  | { kind: 'active'; note: string | null; progress: { value: number; max: number } | null }
  | { kind: 'text'; text: string; tone: 'ink' | 'ink-3' | 'danger' };

/** What the Result column shows: progress while active, the summary, the error, or "Cancelled by you". */
export function resultCell(job: JobResponse): ResultCellModel {
  if (isActiveJob(job.status)) {
    const total = job.progressTotal;
    const progress =
      total != null && total > 0 && job.progressCurrent != null
        ? { value: Math.min(job.progressCurrent, total), max: total }
        : null;
    return { kind: 'active', note: job.progressNote ?? null, progress };
  }
  if (job.status === 'FAILED') {
    return { kind: 'text', text: job.errorMessage || job.errorCode || 'Failed', tone: 'danger' };
  }
  if (job.status === 'CANCELLED') return { kind: 'text', text: 'Cancelled by you', tone: 'ink' };
  const summary = jobSummary(job);
  return summary ? { kind: 'text', text: summary, tone: 'ink' } : { kind: 'text', text: '—', tone: 'ink-3' };
}

/** The one line the phone row shows under the job: when it started and what it did. */
export function phoneLine(job: JobResponse): string {
  const cell = resultCell(job);
  const detail = cell.kind === 'active' ? cell.note : cell.text === '—' ? null : cell.text;
  return [startedLabel(job.createdAt), detail].filter(Boolean).join(' · ');
}

