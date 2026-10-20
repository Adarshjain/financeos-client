import React from 'react';

import { Text } from '@/components/ds';
import { breakdownLines } from '@/features/jobs/gmailSyncModel';
import type { SyncSummary } from '@/lib/types';

import { SyncAttention } from './SyncAttention';
import { type Counter, SyncCounters } from './SyncCounters';
import { SyncEmails } from './SyncEmails';
import { SyncRunContext } from './SyncRunContext';

function Breakdown({ result }: { result: SyncSummary }) {
  const lines = breakdownLines(result);
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-space-2" data-testid="sync-breakdown">
      {lines.map((line) => (
        <Text key={line.key} variant="caption" tone="ink-2" as="p">
          {line.label ? <strong>{line.label}</strong> : null}
          {line.label ? ' ' : ''}
          {line.text}
        </Text>
      ))}
    </div>
  );
}

function countersFor(result: SyncSummary): { counters: Counter[]; desktopColumns: 5 | 6 } {
  if (result.discovered === undefined) {
    return {
      desktopColumns: 5,
      counters: [
        { label: 'Fetched', value: result.fetched ?? 0 },
        { label: 'Created', value: result.created ?? 0 },
        { label: 'Reconciled', value: result.reconciled ?? 0 },
        { label: 'Skipped', value: result.skipped ?? 0 },
        { label: 'Failed', value: result.failed ?? 0, tone: 'danger' },
      ],
    };
  }
  return {
    desktopColumns: 6,
    counters: [
      { label: 'Discovered', value: result.discovered ?? 0 },
      { label: 'Processed', value: result.processed ?? 0 },
      { label: 'Created', value: result.created ?? 0 },
      { label: 'Reconciled', value: result.reconciled ?? 0 },
      { label: 'Parked', value: result.parked ?? 0, tone: 'warning' },
      { label: 'Failed', value: result.failedPermanent ?? result.failed ?? 0, tone: 'danger' },
    ],
  };
}

/** The Gmail sync result: run context, counters, breakdown, emails by outcome; older formats degrade. */
export function GmailSyncResult({ result }: { result: SyncSummary }) {
  const isLegacy = result.discovered === undefined;
  const hasRunDetail = result.statusCounts !== undefined;
  const hasSkippedBreakdown =
    (result.alreadyProcessed !== undefined && result.alreadyProcessed > 0) ||
    (result.nonTransaction !== undefined && result.nonTransaction > 0);
  const { counters, desktopColumns } = countersFor(result);

  return (
    <div className="flex flex-col gap-space-8" data-testid="gmail-sync-result">
      <Text variant="body-strong" as="p">
        Gmail sync summary
      </Text>

      {hasRunDetail ? <SyncRunContext result={result} /> : null}

      <SyncCounters counters={counters} desktopColumns={desktopColumns} />

      {!isLegacy ? (
        hasRunDetail ? (
          <Breakdown result={result} />
        ) : (
          <Text variant="caption" tone="ink-2" as="p" data-testid="sync-middle-line">
            Skipped: {result.skipped ?? 0} · Retryable: {result.failedRetryable ?? 0} · Backlog remaining:{' '}
            {result.backlogRemaining ?? 0}
          </Text>
        )
      ) : null}

      {hasSkippedBreakdown ? (
        <Text variant="caption" tone="ink-2" as="p">
          Of the skipped: {result.alreadyProcessed ?? 0} already processed · {result.nonTransaction ?? 0}{' '}
          non-transaction emails
        </Text>
      ) : null}

      {result.messages ? <SyncEmails messages={result.messages} truncated={result.messagesTruncated ?? 0} /> : null}

      <SyncAttention result={result} />
    </div>
  );
}
