'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { useJobMutations } from '@/features/jobs/useJobMutations';
import type { JobResponse } from '@/lib/types';

/** Cancel on an active job (disabled once cancelling), Retry on a failed or cancelled one. */
export function JobActions({ job, onRetried }: { job: JobResponse; onRetried?: (job: { id: string }) => void }) {
  const { cancel, retry, busy } = useJobMutations({ onRetried });

  if (job.status === 'PENDING' || job.status === 'RUNNING') {
    return (
      <Button
        variant="secondary"
        size="sm"
        loading={busy}
        disabled={busy || Boolean(job.cancelRequested)}
        onClick={() => cancel(job.id)}
      >
        Cancel
      </Button>
    );
  }

  if (job.status === 'FAILED' || job.status === 'CANCELLED') {
    return (
      <Button variant="secondary" size="sm" loading={busy} disabled={busy} onClick={() => retry(job.id)}>
        Retry
      </Button>
    );
  }

  return null;
}
