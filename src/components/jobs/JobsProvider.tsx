'use client';

import { useRouter } from 'next/navigation';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { cancelJob as cancelJobAction, getJob, listActiveJobs } from '@/actions/jobs';
import { getJobTypeLabel } from '@/components/jobs/jobUtils';
import type { JobResponse } from '@/lib/types';

interface JobsContextType {
  activeJobs: JobResponse[];
  notifyJobStarted: (jobId: string) => void;
  cancelActiveJob: (jobId: string) => Promise<void>;
}

const JobsContext = createContext<JobsContextType>({
  activeJobs: [],
  notifyJobStarted: () => {},
  cancelActiveJob: async () => {},
});

export const useJobs = () => useContext(JobsContext);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [activeJobs, setActiveJobs] = useState<JobResponse[]>([]);
  const trackedJobsRef = useRef<Map<string, JobResponse>>(new Map());
  const locallyStartedJobIdsRef = useRef<Set<string>>(new Set());
  const router = useRouter();

  const syncActiveJobs = useCallback(async () => {
    const res = await listActiveJobs();
    if (res.success && res.data) {
      const freshActive = res.data;
      const freshActiveIds = new Set(freshActive.map((j) => j.id));

      let shouldRefresh = false;

      for (const [id, oldJob] of Array.from(trackedJobsRef.current.entries())) {
        if (!freshActiveIds.has(id)) {
          if (oldJob.status === 'PENDING' || oldJob.status === 'RUNNING') {
            shouldRefresh = true;
            const isLocal = locallyStartedJobIdsRef.current.has(id);
            locallyStartedJobIdsRef.current.delete(id);

            const finalRes = await getJob(id);
            const finalJob = finalRes.success ? finalRes.data : null;

            if (!finalJob) {
              // Final state unknown (fetch failed / job purged) — stay neutral.
              if (!isLocal) {
                toast.info(`${getJobTypeLabel(oldJob.type)} finished`);
              }
            } else if (finalJob.status === 'CANCELLED') {
              toast.info(`${getJobTypeLabel(oldJob.type)} cancelled`);
            } else if (finalJob.status === 'FAILED') {
              const reason = finalJob.errorMessage ? `: ${finalJob.errorMessage}` : '';
              toast.error(`${getJobTypeLabel(oldJob.type)} failed${reason}`);
            } else {
              if (!isLocal) {
                toast.success(`${getJobTypeLabel(oldJob.type)} completed`);
              }
            }
          }
          trackedJobsRef.current.delete(id);
        }
      }

      for (const job of freshActive) {
        trackedJobsRef.current.set(job.id, job);
      }

      setActiveJobs(freshActive);

      if (shouldRefresh) {
        router.refresh();
      }
    }
  }, [router]);

  // Initial fetch, deferred a tick: syncActiveJobs sets state, and calling it
  // synchronously in the effect body trips react-hooks/set-state-in-effect.
  useEffect(() => {
    const id = setTimeout(syncActiveJobs, 0);
    return () => clearTimeout(id);
  }, [syncActiveJobs]);

  useEffect(() => {
    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      syncActiveJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeJobs.length, syncActiveJobs]);

  const notifyJobStarted = useCallback(
    (jobId: string) => {
      if (jobId) {
        locallyStartedJobIdsRef.current.add(jobId);
      }
      syncActiveJobs();
    },
    [syncActiveJobs]
  );

  const cancelActiveJob = useCallback(
    async (jobId: string) => {
      const res = await cancelJobAction(jobId);
      if (res.success) {
        toast.info('Cancellation requested');
        syncActiveJobs();
      } else {
        toast.error(res.error.message || 'Failed to cancel job');
      }
    },
    [syncActiveJobs]
  );

  return (
    <JobsContext.Provider value={{ activeJobs, notifyJobStarted, cancelActiveJob }}>
      {children}
    </JobsContext.Provider>
  );
}
