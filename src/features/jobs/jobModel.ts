import { todayInAppZone } from '@/lib/date-range';
import { formatDate, formatTime } from '@/lib/format';
import type { JobStatus } from '@/lib/types';

export type JobBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const JOB_STATUS_BADGE: Record<JobStatus, { label: string; tone: JobBadgeTone }> = {
  PENDING: { label: 'Pending', tone: 'neutral' },
  RUNNING: { label: 'Running', tone: 'info' },
  SUCCEEDED: { label: 'Succeeded', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export function isActiveJob(status: JobStatus): boolean {
  return status === 'PENDING' || status === 'RUNNING';
}

/** "2:02 pm" for a job started today, "12 Oct 9:00 am" for an older one. */
export function jobTimeLabel(createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '—';
  const sameDay = todayInAppZone(created) === todayInAppZone(now);
  return sameDay ? formatTime(created) : `${formatDate(created, 'list')} ${formatTime(created)}`;
}

/** Progress of an active job as a determinate value, or null when it has no total yet. */
export function jobProgress(job: {
  progressCurrent?: number | null;
  progressTotal?: number | null;
}): { value: number; max: number } | null {
  if (job.progressTotal != null && job.progressTotal > 0 && job.progressCurrent != null) {
    return { value: Math.min(job.progressCurrent, job.progressTotal), max: job.progressTotal };
  }
  return null;
}
