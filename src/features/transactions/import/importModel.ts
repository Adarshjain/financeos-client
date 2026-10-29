import { parsePage, setPageParam } from '@/features/shell/pagination';
import { appHref } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import type { FileIngestionResult, JobResponse } from '@/lib/types';

export const IMPORT_HREF = appHref('/transactions/import');
/** Recent imports: how many show on the Import tab; the rest are in Activity. */
export const RECENT_IMPORTS_SIZE = 5;
export const IMPORT_JOB_TYPE = 'STATEMENT_INGEST';
export const IMPORT_ACTIVITY_HREF = appHref(`/settings/activity?type=${IMPORT_JOB_TYPE}`);

/** `?page=` on the Import tab: the 0-based page of Recent imports (the address counts from 1); anything unusable is the first page. */
export function parseImportPage(params: SearchParamsRecord): number {
  return parsePage(params).page;
}

/** `?account=`: the account the Import form starts on (a link from a statement). */
export function parseImportAccount(params: SearchParamsRecord): string | undefined {
  return first(params.account);
}

/** The Import tab at a page of Recent imports, keeping the chosen account. */
export function importUrl(opts: { page?: number; account?: string } = {}): string {
  const out = new URLSearchParams();
  if (opts.account) out.set('account', opts.account);
  setPageParam(out, opts.page ?? 0);
  const qs = out.toString();
  return qs ? `${IMPORT_HREF}?${qs}` : IMPORT_HREF;
}

/** Recent imports covers this many days back. */
export const RECENT_IMPORTS_DAYS = 30;

/** The instant Recent imports starts at: the start of the app-zone day `today` (YYYY-MM-DD) minus 30 days. */
export function recentImportsSince(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
// Calendar arithmetic on UTC-midnight dates, not a clock read: no zone is involved.
  const day = new Date(Date.UTC(y, m - 1, d - RECENT_IMPORTS_DAYS)).toISOString().slice(0, 10);
  // The app zone is Asia/Kolkata (UTC+05:30, no daylight saving).
  return new Date(`${day}T00:00:00+05:30`).toISOString();
}

const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isJobId = (id: string) => JOB_ID.test(id);

export const importJobHref = (jobId: string) => appHref(`/transactions/import/${encodeURIComponent(jobId)}`);

export function ingestResult(job: JobResponse): FileIngestionResult | null {
  const r = job.result;
  return job.status === 'SUCCEEDED' && r && typeof r === 'object' ? (r as FileIngestionResult) : null;
}

/** The job's name: the file, or "n files" for several. */
export function importJobTitle(job: JobResponse): string {
  const files = ingestResult(job)?.fileDetails ?? [];
  if (files.length === 1) return files[0].filename;
  if (files.length > 1) return `${files.length} files`;
  return 'Statement import';
}

export function importTotals(result: FileIngestionResult) {
  const files = result.fileDetails ?? [];
  return {
    files: files.length || result.filesProcessed,
    lines: files.reduce((sum, f) => sum + (f.linesParsed ?? 0), 0),
    created: result.totalCreated ?? 0,
    duplicates: result.totalDuplicatesFound ?? 0,
  };
}
