import type { JobType } from '@/lib/types';

/**
 * Human label for a JobType. Lives in this directive-free module so BOTH
 * server components (jobs history page) and client components can call it —
 * a function exported from a 'use client' module cannot be invoked during
 * server render.
 */
export function getJobTypeLabel(type: JobType): string {
  switch (type) {
    case 'STATEMENT_INGEST':
      return 'Statement Ingestion';
    case 'GMAIL_SYNC':
      return 'Gmail Sync';
    case 'PRICE_REFRESH':
      return 'Price Refresh';
    case 'INVESTMENT_IMPORT_COMMIT':
      return 'Investment Import Commit';
    case 'BROKER_RECONCILE_COMMIT':
      return 'Broker Reconcile Commit';
    case 'RULE_APPLY':
      return 'Rule Apply';
    default:
      return type;
  }
}

/**
 * Builds a /settings/jobs URL for the given filter state. Shared between the
 * server-rendered page and the client PageActionBar — a function can't cross
 * the server→client prop boundary, so both sides build URLs from primitives.
 */
export function buildJobsFilterUrl(
  current: { statusFilter: string; typeFilter: string; size: number },
  overrides: { newStatus?: string; newType?: string; newPage?: number } = {},
): string {
  const q = new URLSearchParams();
  const st = overrides.newStatus !== undefined ? overrides.newStatus : current.statusFilter;
  const tp = overrides.newType !== undefined ? overrides.newType : current.typeFilter;
  const page = overrides.newPage ?? 0;
  if (st) q.set('status', st);
  if (tp) q.set('type', tp);
  if (page > 0) q.set('page', String(page));
  if (current.size !== 20) q.set('size', String(current.size));
  const str = q.toString();
  return `/settings/jobs${str ? `?${str}` : ''}`;
}

/**
 * Query params for the jobs-history list, in the exact shape used both by the
 * server-side prefetch (`queryClient.setQueryData`) and the client `useQuery`
 * in JobsHistoryTable — they must match byte-for-byte so TanStack Query's key
 * hash lines up and hydration needs no client refetch.
 */
export function buildJobsQueryParams(filters: {
  page: number;
  size: number;
  statusFilter: string;
  typeFilter: string;
}): { page: number; size: number; status?: string; type?: string } {
  return {
    page: filters.page,
    size: filters.size,
    status: filters.statusFilter || undefined,
    type: filters.typeFilter || undefined,
  };
}

export function formatDuration(startedAt?: string | null, finishedAt?: string | null): string {
  if (!startedAt) return '-';
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${remSec}s`;
}
