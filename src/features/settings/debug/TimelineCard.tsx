'use client';

import React, { useState } from 'react';

import { Button, Card, Icon, Text } from '@/components/ds';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';

import { formatClock, timelineDepth } from './debugModel';
import { useCopyRawLog } from './useCopyRawLog';

interface TimelineCardProps {
  timeline: DiagnosticsLookupResponse['timeline'];
  truncated?: boolean;
  currentRef?: string;
  currentType?: string;
}

const INDENT = ['', 'pl-space-14', 'pl-space-28'] as const;

/** The log lines around the request, one mono line each, with Copy raw in the header. */
export function TimelineCard({ timeline, truncated = false, currentRef, currentType = 'auto' }: TimelineCardProps) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const { copyRaw, copying } = useCopyRawLog(currentRef, currentType);

  return (
    <Card
      title="Timeline"
      subtitle="Log lines around the request"
      action={
        currentRef ? (
          <Text variant="label" as="span">
            <Button variant="link" size="sm" onClick={copyRaw} disabled={copying}>
              Copy raw
            </Button>
          </Text>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-space-4 px-space-16 pb-space-14">
        {truncated ? (
          <Text variant="label" tone="warning">
            Truncated to first 500 lines
          </Text>
        ) : null}
        {timeline.map((entry, idx) => {
          const fields = Object.entries(entry.fields ?? {});
          const hasDetails = fields.length > 0 || Boolean(entry.stackTrace);
          const isOpen = Boolean(open[idx]);
          const isError = entry.level.toUpperCase() === 'ERROR';
          return (
            <div key={idx} className={INDENT[timelineDepth(entry)]}>
              <div className="flex items-start gap-space-4">
                <Text
                  mono
                  variant="caption"
                  tone={isError ? 'danger' : 'ink'}
                  className="min-w-0 flex-1 break-words"
                >
                  <Text mono variant="caption" tone="ink-3">
                    {formatClock(entry.at)}
                  </Text>{' '}
                  {entry.event ? <strong>{entry.event} </strong> : null}
                  {entry.message}
                </Text>
                {hasDetails ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={isOpen ? 'Hide details' : 'Show details'}
                    aria-expanded={isOpen}
                    icon={<Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size="sm" />}
                    onClick={() => setOpen((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  />
                ) : null}
              </div>
              {isOpen ? (
                <div className="flex flex-col gap-space-4 pl-space-14 pt-space-4">
                  {fields.map(([k, v]) => (
                    <Text key={k} mono variant="caption" tone="ink-2" className="break-words">
                      {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </Text>
                  ))}
                  {entry.stackTrace ? (
                    <Text
                      as="div"
                      mono
                      variant="caption"
                      tone="ink-2"
                      className="whitespace-pre-wrap break-words"
                    >
                      {entry.stackTrace}
                    </Text>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
