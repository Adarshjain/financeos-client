import React from 'react';

import { breakdownLines } from '@/features/jobs/gmailSyncModel';
import type { SyncSummary } from '@/lib/types';

import { LegacyAttention } from './gmail-sync/LegacyAttention';
import { SyncMessageList } from './gmail-sync/SyncMessageList';
import { SyncRunContext } from './gmail-sync/SyncRunContext';

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200/70 dark:border-slate-800 text-center">
      <div className={`font-black text-sm sm:text-base ${tone}`}>{value}</div>
      <div className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

const NEUTRAL = 'text-slate-800 dark:text-slate-200';
const CREATED = 'text-emerald-600 dark:text-emerald-400';
const RECONCILED = 'text-blue-600 dark:text-blue-400';
const PARKED = 'text-amber-600 dark:text-amber-400';
const FAILED = 'text-rose-600 dark:text-rose-400';

/** Why the run's skipped/parked/failed emails ended up there, and what is still queued. */
function Breakdown({ result }: { result: SyncSummary }) {
  return (
    <div className="space-y-0.5 text-2xs text-slate-600 dark:text-slate-400">
      {breakdownLines(result).map((line) => (
        <div key={line.key}>
          {line.label && <span className="font-semibold">{line.label}</span>} {line.text}
        </div>
      ))}
    </div>
  );
}

export function GmailSyncResultDetails({ result }: { result: SyncSummary }) {
  const isLegacy = result.discovered === undefined;
  const hasRunDetail = result.statusCounts !== undefined;

  const hasSkippedBreakdown =
    (result.alreadyProcessed !== undefined && result.alreadyProcessed > 0) ||
    (result.nonTransaction !== undefined && result.nonTransaction > 0);

  return (
    <div className="space-y-2.5 text-2xs pt-1">
      <span className="font-semibold text-slate-800 dark:text-slate-200 block">Gmail Sync Summary</span>

      {hasRunDetail && <SyncRunContext result={result} />}

      {isLegacy ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
          <Stat label="Fetched" value={result.fetched ?? 0} tone={NEUTRAL} />
          <Stat label="Created" value={result.created ?? 0} tone={CREATED} />
          <Stat label="Reconciled" value={result.reconciled ?? 0} tone={RECONCILED} />
          <Stat label="Skipped" value={result.skipped ?? 0} tone="text-slate-600 dark:text-slate-400" />
          <div className="col-span-3 sm:col-span-1">
            <Stat label="Failed" value={result.failed ?? 0} tone={FAILED} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
            <Stat label="Discovered" value={result.discovered ?? 0} tone={NEUTRAL} />
            <Stat label="Processed" value={result.processed ?? 0} tone={NEUTRAL} />
            <Stat label="Created" value={result.created ?? 0} tone={CREATED} />
            <Stat label="Reconciled" value={result.reconciled ?? 0} tone={RECONCILED} />
            <Stat label="Parked" value={result.parked ?? 0} tone={PARKED} />
            <Stat label="Failed" value={result.failedPermanent ?? result.failed ?? 0} tone={FAILED} />
          </div>

          {hasRunDetail ? (
            <Breakdown result={result} />
          ) : (
            <div className="text-2xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
              <span>Skipped: {result.skipped ?? 0}</span>
              <span>Retryable: {result.failedRetryable ?? 0}</span>
              <span>Backlog remaining: {result.backlogRemaining ?? 0}</span>
            </div>
          )}
        </>
      )}

      {hasSkippedBreakdown && (
        <div className="text-2xs text-slate-500">
          Of the skipped: {result.alreadyProcessed ?? 0} already processed · {result.nonTransaction ?? 0} non-transaction emails
        </div>
      )}

      {result.messages && <SyncMessageList messages={result.messages} truncated={result.messagesTruncated ?? 0} />}

      <LegacyAttention result={result} />
    </div>
  );
}
