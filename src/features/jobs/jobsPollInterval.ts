import type { JobResponse } from '@/lib/types';

/** Poll fast while a job is queued or running (or one was just enqueued here), slowly otherwise. */
export const JOBS_POLL_ACTIVE_MS = 5_000;
export const JOBS_POLL_IDLE_MS = 30_000;

export function jobsPollInterval(jobs: readonly Pick<JobResponse, 'status'>[] | undefined, justEnqueued = false): number {
  if (justEnqueued) return JOBS_POLL_ACTIVE_MS;
  return jobs?.some((j) => j.status === 'PENDING' || j.status === 'RUNNING') ? JOBS_POLL_ACTIVE_MS : JOBS_POLL_IDLE_MS;
}
