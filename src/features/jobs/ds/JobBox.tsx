'use client';

import React from 'react';

import { Badge, Button, Card, Icon, Text } from '@/components/ds';
import { isActiveJob, JOB_STATUS_BADGE, jobTimeLabel } from '@/features/jobs/jobModel';
import { formatDuration } from '@/features/jobs/jobUtils';
import type { JobResponse } from '@/lib/types';

interface JobBoxProps {
  job: JobResponse;
  /** Terminal jobs only: whether the details below are open. */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Cancel or Retry, drawn left of the chevron. */
  actions?: React.ReactNode;
  /** Active body or, when expanded, the result or error. */
  children?: React.ReactNode;
}

/** One job: status, time, duration, actions and (on terminal jobs) a chevron that opens its details. */
export function JobBox({ job, expanded, onExpandedChange, actions, children }: JobBoxProps) {
  const active = isActiveJob(job.status);
  const badge = JOB_STATUS_BADGE[job.status];

  return (
    <Card variant="inset" data-testid="job-box" data-job-id={job.id} data-status={job.status}>
      <div className="flex items-center justify-between gap-space-8 p-space-8">
        <div className="flex items-center gap-space-8 min-w-0">
          <Badge tone={badge.tone} size="md">
            {badge.label}
          </Badge>
          <Text variant="body-strong" data-testid="job-time">
            {jobTimeLabel(job.createdAt)}
          </Text>
          <Text variant="caption" tone="ink-3" mono data-testid="job-duration">
            {formatDuration(job.startedAt, job.finishedAt)}
          </Text>
        </div>
        <div className="flex items-center gap-space-4 shrink-0">
          {actions}
          {!active ? (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
              aria-expanded={expanded}
              onClick={() => onExpandedChange(!expanded)}
              icon={<Icon name={expanded ? 'chevron-down' : 'chevron-right'} size="sm" />}
            />
          ) : null}
        </div>
      </div>
      {children ? <div className="flex flex-col gap-space-8 px-space-8 pb-space-8">{children}</div> : null}
    </Card>
  );
}
