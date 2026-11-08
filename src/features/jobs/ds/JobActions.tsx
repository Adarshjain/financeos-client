'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { useJobMutations } from '@/features/jobs/useJobMutations';
import type { JobResponse } from '@/lib/types';

/** Cancel on an active job (disabled once cancelling), Retry on a failed or cancelled one. `pending` keeps Retry loading while the page that `onRetried` opens is still arriving. */
export function JobActions({ job, onRetried, pending = false }: { job: JobResponse; onRetried?: (job: { id: string }) => void; pending?: boolean }) {
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
      <Button variant="secondary" size="sm" loading={busy || pending} disabled={busy || pending} onClick={() => retry(job.id)}>
        Retry
      </Button>
    );
  }

  return null;
}
