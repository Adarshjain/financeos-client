import React from 'react';

import { ProgressBar, Text } from '@/components/ds';
import { jobProgress } from '@/features/jobs/jobModel';
import type { JobResponse } from '@/lib/types';

/** What a pending or running job is doing: its note and a bar (determinate when it knows its total). */
export function ActiveJobBody({ job }: { job: JobResponse }) {
  const progress = jobProgress(job);
  return (
    <div className="flex flex-col gap-space-6">
      {job.progressNote ? (
        <Text variant="label" tone="ink-2" as="p">
          {job.progressNote}
        </Text>
      ) : null}
      {progress ? <ProgressBar value={progress.value} max={progress.max} /> : <ProgressBar />}
    </div>
  );
}
