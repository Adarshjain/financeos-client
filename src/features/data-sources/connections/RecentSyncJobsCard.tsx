'use client';

import Link from 'next/link';
import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Text } from '@/components/ds/Text/Text';
import { ActiveJobBody } from '@/features/jobs/ds/ActiveJobBody';
import { GmailSyncResult } from '@/features/jobs/ds/GmailSyncResult';
import { JobActions } from '@/features/jobs/ds/JobActions';
import { JobBox } from '@/features/jobs/ds/JobBox';
import { JobErrorBody } from '@/features/jobs/ds/JobErrorBody';
import { isActiveJob } from '@/features/jobs/jobModel';
import { useJobsListPolling } from '@/features/jobs/useJobsListPolling';
import type { SyncSummary } from '@/lib/types';

import { ACTIVITY_GMAIL_HREF } from './connectionsModel';

/** The last five Gmail sync jobs, live while one runs, each expandable to its result or error. */
export function RecentSyncJobsCard() {
  const { jobs, loading, expandedJobIds, toggleExpand } = useJobsListPolling({ types: ['GMAIL_SYNC'], size: 5 });
  const live = jobs.some((j) => isActiveJob(j.status));

  return (
    <Card
      title="Recent sync jobs"
      subtitle="Gmail sync · last 5"
      action={
        <div className="flex items-center gap-space-8">
          {live ? <Badge tone="success">Live</Badge> : null}
          <Text variant="label" as="span">
            <Button asChild variant="link" size="sm">
              <Link href={ACTIVITY_GMAIL_HREF}>View all</Link>
            </Button>
          </Text>
        </div>
      }
    >
      {loading ? (
        <Card.Empty>Loading jobs…</Card.Empty>
      ) : jobs.length === 0 ? (
        <Card.Empty>No recent sync jobs yet</Card.Empty>
      ) : (
        <div className="flex flex-col gap-space-8 px-space-16 pb-space-16">
          {jobs.map((job) => {
            const expanded = expandedJobIds.has(job.id);
            const active = isActiveJob(job.status);
            return (
              <JobBox
                key={job.id}
                job={job}
                expanded={expanded}
                onExpandedChange={() => toggleExpand(job.id)}
                actions={<JobActions job={job} />}
              >
                {active ? <ActiveJobBody job={job} /> : null}
                {!active && expanded && (job.status === 'FAILED' || job.status === 'CANCELLED') ? (
                  <JobErrorBody errorCode={job.errorCode} errorMessage={job.errorMessage} />
                ) : null}
                {!active && expanded && job.status === 'SUCCEEDED' && job.result && typeof job.result === 'object' ? (
                  <GmailSyncResult result={job.result as SyncSummary} />
                ) : null}
              </JobBox>
            );
          })}
        </div>
      )}
    </Card>
  );
}
