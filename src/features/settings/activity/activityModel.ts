import { buildJobsFilterUrl } from '@/features/jobs/jobsFilterModel';
import { DEFAULT_PAGE_SIZE } from '@/features/shell/pagination';
import { appHref } from '@/features/shell/routes';
import type { JobResponse } from '@/lib/types';

export const ACTIVITY_HREF = appHref('/settings/activity');
export const ACTIVITY_SIZE_OPTIONS = [10, 25, 50, 100];

/** The status filter values the URL and the API use today; '' is every status, 'active' is pending plus running. */
export const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Running', value: 'active' },
  { label: 'Succeeded', value: 'SUCCEEDED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

/** "Status: Failed" once a choice is made, "Status: All" before. */
export function filterChipLabel(
  name: 'Status' | 'Type',
  options: { label: string; value: string }[],
  value: string,
): string {
  if (!value) return `${name}: All`;
  const label = options.find((o) => o.value === value)?.label ?? value;
  return `${name}: ${label}`;
}

export interface ActivityUrlState {
  statusFilter: string;
  typeFilter: string;
  size: number;
}

/** The Activity tab URL for a filter, page and size, with `?job=` kept when given. */
export function activityUrl(
  current: ActivityUrlState,
  overrides: { newStatus?: string; newType?: string; newPage?: number; job?: string | null } = {},
): string {
  const { job, ...rest } = overrides;
  const base = buildJobsFilterUrl(current, rest, { base: ACTIVITY_HREF, defaultSize: DEFAULT_PAGE_SIZE, oneBasedPage: true });
  if (!job) return base;
  return `${base}${base.includes('?') ? '&' : '?'}job=${encodeURIComponent(job)}`;
}

/** "Started by you" for a user job, "Started automatically" for a scheduled one. */
export function startedByLabel(job: Pick<JobResponse, 'triggerSource'>): string {
  return job.triggerSource === 'CRON' ? 'Started automatically' : 'Started by you';
}
