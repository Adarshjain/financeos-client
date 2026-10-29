import type { SyncSummary } from '@/lib/types';

import { describeCounts, PARKED_STATUSES, SKIPPED_STATUSES } from './syncLabelsModel';

/** The address inside a "Name <a@b.c>" From header, or the header itself. */
export function formatFromHeader(from: string): string {
  if (!from) return '—';
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

export interface BreakdownLine {
  key: string;
  /** Bold lead-in ("Skipped (10):"); absent for the plain backlog line. */
  label?: string;
  text: string;
}

/** Why the run's skipped/parked/failed emails ended up there, and what is still queued. */
export function breakdownLines(result: SyncSummary): BreakdownLine[] {
  const counts = result.statusCounts ?? {};
  const skipped = describeCounts(counts, SKIPPED_STATUSES);
  const parked = describeCounts(counts, PARKED_STATUSES);
  const retryable = result.failedRetryable ?? 0;
  const permanent = result.failedPermanent ?? 0;
  const backlog = result.backlogRemaining ?? 0;
  const hitBudget = result.budget !== undefined && result.budget > 0 && (result.processed ?? 0) >= result.budget;

  const lines: BreakdownLine[] = [];
  if (skipped) lines.push({ key: 'skipped', label: `Skipped (${result.skipped}):`, text: skipped });
  if (parked) lines.push({ key: 'parked', label: `Parked (${result.parked ?? 0}):`, text: parked });
  if (retryable + permanent > 0) {
    lines.push({
      key: 'failed',
      label: `Failed (${retryable + permanent}):`,
      text: `${retryable} will retry · ${permanent} permanent`,
    });
  }
  if (backlog > 0) {
    lines.push({
      key: 'backlog',
      text: hitBudget
        ? `Hit the ${result.budget}-email limit for this run; ${backlog} still queued, the next sync continues.`
        : `${backlog} still queued (retries wait for their scheduled time).`,
    });
  }
  return lines;
}
