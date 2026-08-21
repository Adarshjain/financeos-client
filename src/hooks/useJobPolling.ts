'use client';

import { useEffect, useRef, useState } from 'react';

import { getJob } from '@/actions/jobs';
import type { JobResponse, JobStatus } from '@/lib/types';

const TERMINAL: ReadonlySet<JobStatus> = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);

/**
 * Polls one job until it reaches a terminal status (1.5s → 5s backoff).
 *
 * `onSettled` fires exactly once when the job lands on SUCCEEDED/FAILED/
 * CANCELLED — do toasts and state updates there (it runs in the async poll
 * callback, an event context, so setState is fine; reacting to the terminal
 * status via a useEffect would be a react-hooks/set-state-in-effect lint
 * error). State is keyed by jobId, so switching or clearing the id never
 * needs an effect-time reset.
 */
export function useJobPolling<T = unknown>(
  jobId: string | null,
  onSettled?: (job: JobResponse<T>) => void,
) {
  const [snapshot, setSnapshot] = useState<{
    forId: string;
    job: JobResponse<T> | null;
    error: string | null;
  } | null>(null);

  const activeJobIdRef = useRef<string | null>(jobId);
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  useEffect(() => {
    activeJobIdRef.current = jobId;
    if (!jobId) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const startTime = Date.now();

    const poll = async () => {
      if (activeJobIdRef.current !== jobId) return;

      try {
        const res = await getJob(jobId);
        if (activeJobIdRef.current !== jobId) return;

        if (res.success && res.data) {
          const currentJob = res.data as JobResponse<T>;
          setSnapshot({ forId: jobId, job: currentJob, error: null });

          if (TERMINAL.has(currentJob.status)) {
            onSettledRef.current?.(currentJob);
            return;
          }
        } else if (!res.success) {
          setSnapshot((prev) => ({
            forId: jobId,
            job: prev?.forId === jobId ? prev.job : null,
            error: res.error.message || 'Failed to fetch job status',
          }));
        }
      } catch (err: unknown) {
        if (activeJobIdRef.current !== jobId) return;
        const msg = err instanceof Error ? err.message : 'Error fetching job status';
        setSnapshot((prev) => ({
          forId: jobId,
          job: prev?.forId === jobId ? prev.job : null,
          error: msg,
        }));
      }

      const elapsed = Date.now() - startTime;
      const delay = elapsed > 20000 ? 5000 : 1500;
      timeoutId = setTimeout(poll, delay);
    };

    poll();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [jobId]);

  const job = snapshot && snapshot.forId === jobId ? snapshot.job : null;
  const error = snapshot && snapshot.forId === jobId ? snapshot.error : null;
  const isPolling = Boolean(jobId) && !(job && TERMINAL.has(job.status));

  return { job, isPolling, error };
}
