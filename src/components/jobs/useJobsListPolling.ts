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

  // Track transitions from active to terminal to auto-expand
  useEffect(() => {
    if (!jobs.length) return;
    const newlyTerminalIds: string[] = [];
    for (const job of jobs) {
      const wasActive = prevActiveJobIdsRef.current.has(job.id);
      const isTerminal =
        job.status === 'SUCCEEDED' ||
        job.status === 'FAILED' ||
        job.status === 'CANCELLED';
      if (wasActive && isTerminal) {
        newlyTerminalIds.push(job.id);
      }
    }

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

    const currentActiveIds = new Set(
      jobs
        .filter((j) => j.status === 'PENDING' || j.status === 'RUNNING')
        .map((j) => j.id)
    );
    prevActiveJobIdsRef.current = currentActiveIds;
  }, [jobs]);

  // Subscribe to job started event on bus
  useEffect(() => {
    return subscribeJobStarted(() => {
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
