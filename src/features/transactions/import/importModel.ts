import { appHref } from '@/features/shell/routes';
import type { FileIngestionResult, JobResponse } from '@/lib/types';

export const IMPORT_HREF = appHref('/transactions/import');
/** Recent imports: how many show on the Import tab; the rest are in Activity. */
export const RECENT_IMPORTS_SIZE = 5;
export const IMPORT_JOB_TYPE = 'STATEMENT_INGEST';
export const IMPORT_ACTIVITY_HREF = appHref(`/settings/activity?type=${IMPORT_JOB_TYPE}`);

/** Recent imports covers this many days back. */
export const RECENT_IMPORTS_DAYS = 30;

/** The instant Recent imports starts at: the start of the app-zone day `today` (YYYY-MM-DD) minus 30 days. */
export function recentImportsSince(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
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
