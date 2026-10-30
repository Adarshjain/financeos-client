'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Text } from '@/components/ds/Text/Text';
import { JobsHistory } from '@/components/organisms/JobsHistory/JobsHistory';
import { useJobsHistory } from '@/features/jobs/useJobsHistory';
import { activityUrl } from '@/features/settings/activity/activityModel';
import type { JobResponse } from '@/lib/types';

import { RULE_JOB_TYPE, RULE_JOBS_HREF, RULE_JOBS_SIZE } from './rulesModel';

const openHref = (job: JobResponse) => activityUrl({ statusFilter: '', typeFilter: RULE_JOB_TYPE, size: 25 }, { job: job.id });

/** The latest jobs that applied a rule to its matches; the rest are in Activity. */
export function RuleJobsCard() {
  const router = useRouter();
  const history = useJobsHistory({ page: 0, size: RULE_JOBS_SIZE, statusFilter: '', typeFilter: RULE_JOB_TYPE });
  return (
    <Card
      title="Recent rule jobs"
      action={
        <Text variant="label" as="span">
          <Button asChild variant="link" size="sm">
            <Link href={RULE_JOBS_HREF}>Activity</Link>
          </Button>
        </Text>
      }
    >
      <JobsHistory
        compact
        jobs={history.jobs}
        loading={history.isPending}
        skeletonRows={RULE_JOBS_SIZE}
        openHref={openHref}
        onOpen={(job) => router.push(openHref(job))}
        empty={
          <Text variant="body" tone="ink-3" as="p" className="p-space-16">
            No rules applied yet
          </Text>
        }
      />
    </Card>
  );
}
