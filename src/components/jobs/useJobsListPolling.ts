'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { subscribeJobStarted } from '@/components/jobs/jobsBus';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { JobResponse, JobType } from '@/lib/types';

// After a flow announces a new job, poll quickly for this long even if the list doesn't show
// an active job yet: the refetch can race the enqueue, and otherwise the panel would sit on
// the 30s idle interval while the job runs and finishes unseen.
const STARTED_GRACE_MS = 20_000;

interface UseJobsListPollingOptions {
  types?: JobType[];
  size?: number;
}

export function useJobsListPolling({ types, size = 5 }: UseJobsListPollingOptions = {}) {
  const queryClient = useQueryClient();
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const prevActiveJobIdsRef = useRef<Set<string>>(new Set());
  // Jobs announced on the bus whose end the list has not shown yet. A fast job (a small
  // statement ingests in ~150ms) can finish before the first refetch after its enqueue, so it
  // arrives already terminal and the active→terminal transition below never fires for it.
  // Announced ids therefore expand on their first terminal sighting, whatever came before.
  const announcedJobIdsRef = useRef<Set<string>>(new Set());
  const lastStartedAtRef = useRef(0);

  const typeParam = types?.join(',');

  const queryKey = keys.jobs.list({ types: typeParam, size });

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/jobs', {
        params: {
          query: {
            type: typeParam,
            size,
            sort: ['createdAt,desc'],
          },
        },
      });
      return data ?? null;
    },
    refetchInterval: (queryState) => {
      const jobList = queryState.state.data?.content || [];
      const hasActive = jobList.some(
        (j) => j.status === 'PENDING' || j.status === 'RUNNING'
      );
      if (hasActive) return 4000;
      return Date.now() - lastStartedAtRef.current < STARTED_GRACE_MS ? 2000 : 30000;
    },
    refetchIntervalInBackground: false,
  });

  const jobs: JobResponse[] = useMemo(
    () => query.data?.content || [],
    [query.data?.content]
  );

  // Auto-expand a job the first time the list shows it finished, if the list saw it active
  // before or a flow on this page announced it.
  useEffect(() => {
    if (!jobs.length) return;
    const newlyTerminalIds: string[] = [];
    for (const job of jobs) {
      const watched =
        prevActiveJobIdsRef.current.has(job.id) || announcedJobIdsRef.current.has(job.id);
      const isTerminal =
        job.status === 'SUCCEEDED' ||
        job.status === 'FAILED' ||
        job.status === 'CANCELLED';
      if (watched && isTerminal) {
        newlyTerminalIds.push(job.id);
        announcedJobIdsRef.current.delete(job.id);
      }
    }

    // Record what is active now before expanding, so a second job that is still running while
    // the first one finishes is not forgotten.
    prevActiveJobIdsRef.current = new Set(
      jobs
        .filter((j) => j.status === 'PENDING' || j.status === 'RUNNING')
        .map((j) => j.id)
    );

    if (newlyTerminalIds.length > 0) {
      const timer = setTimeout(() => {
        setExpandedJobIds((prev) => {
          const next = new Set(prev);
          newlyTerminalIds.forEach((id) => next.add(id));
          return next;
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [jobs]);

  // Subscribe to job started event on bus
  useEffect(() => {
    return subscribeJobStarted((jobId) => {
      announcedJobIdsRef.current.add(jobId);
      lastStartedAtRef.current = Date.now();
      queryClient.invalidateQueries({ queryKey: keys.jobs.all });
    });
  }, [queryClient]);

  const toggleExpand = (jobId: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  return {
    jobs,
    loading: query.isLoading,
    expandedJobIds,
    toggleExpand,
    refetch: query.refetch,
  };
}
