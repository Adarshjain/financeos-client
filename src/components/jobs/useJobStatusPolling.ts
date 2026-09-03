'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { JobResponse, JobStatus } from '@/lib/types';

const TERMINAL: ReadonlySet<JobStatus> = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);

/**
 * Polls one job via `useQuery` until it reaches a terminal status, replacing
 * the old `useJobPolling` hook (manual setTimeout loop over a server action,
 * removed once every caller had migrated to this). `refetchInterval` handles
 * the poll cadence and stops itself once the cached status is terminal.
 *
 * `onSettled` fires exactly once per jobId when the job lands on
 * SUCCEEDED/FAILED/CANCELLED. It's driven by a `useEffect` reacting to
 * `query.data` (rather than from inside `queryFn`, which the
 * `@tanstack/query/exhaustive-deps` lint rule flags for reading the settled
 * tracking ref) — the `settledForIdRef` guard still ensures it fires once.
 */
export function useJobStatusPolling<T = unknown>(
  jobId: string | null,
  onSettled?: (job: JobResponse<T>) => void,
) {
  const settledForIdRef = useRef<string | null>(null);
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  const query = useQuery({
    queryKey: keys.jobs.byId(jobId ?? ''),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/jobs/{id}', {
        params: { path: { id: jobId as string } },
      });
      // The generated JobResponse's `result` is `unknown`; narrowing it to
      // this hook's caller-supplied `T` can't be done structurally.
      return data as JobResponse<T>;
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => (query.state.data && TERMINAL.has(query.state.data.status) ? false : 1500),
    refetchIntervalInBackground: false,
  });

  const job = query.data ?? null;

  useEffect(() => {
    if (jobId && job && TERMINAL.has(job.status) && settledForIdRef.current !== jobId) {
      settledForIdRef.current = jobId;
      onSettledRef.current?.(job);
    }
  }, [jobId, job]);

  const isPolling = Boolean(jobId) && !(job && TERMINAL.has(job.status));
  const error = query.error instanceof ApiError ? query.error.response.message : query.error instanceof Error ? query.error.message : null;

  return { job, isPolling, error };
}
