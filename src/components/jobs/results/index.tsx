'use client';

import React from 'react';

import type { JobResponse } from '@/lib/types';
import { formatDate } from '@/lib/utils';

import { GmailSyncResultDetails } from './GmailSyncResultDetails';
import { IngestionResultDetails } from './IngestionResultDetails';

export function JobResultDetails({ job }: { job: JobResponse }) {
  if (!job.result || typeof job.result !== 'object') {
    if (job.result != null) {
      return <div className="text-2xs font-medium text-slate-700 dark:text-slate-300">{String(job.result)}</div>;
    }
    return null;
  }

  const res = job.result as Record<string, unknown>;

  switch (job.type) {
    case 'STATEMENT_INGEST':
      return <IngestionResultDetails result={res as any} />;
    case 'GMAIL_SYNC':
      return <GmailSyncResultDetails result={res as any} />;
    case 'PRICE_REFRESH': {
      const refreshed = res.refreshed ?? 0;
      const skipped = res.skipped ?? 0;
      const asOf = res.asOf ? formatDate(String(res.asOf)) : 'today';
      const failedList = Array.isArray(res.failed) ? res.failed : [];
      return (
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-2xs space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            Updated {String(refreshed)} price{refreshed === 1 ? '' : 's'} (as of {asOf}); {String(skipped)} skipped.
          </div>
          {failedList.length > 0 && (
            <div className="text-rose-600 dark:text-rose-400 font-medium">
              Failed ({failedList.length}): {failedList.map((f: any) => `${f.instrumentName || f.instrumentId}: ${f.reason}`).join(', ')}
            </div>
          )}
        </div>
      );
    }
    case 'INVESTMENT_IMPORT_COMMIT':
    case 'BROKER_RECONCILE_COMMIT': {
      const entries = Object.entries(res).filter(
        ([_, v]) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean'
      );
      return (
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-2xs">
          <div className="flex flex-wrap gap-3 font-mono">
            {entries.map(([k, v]) => (
              <span key={k} className="text-slate-700 dark:text-slate-300">
                <strong className="font-semibold text-slate-900 dark:text-slate-100">{k}:</strong> {String(v)}
              </span>
            ))}
          </div>
        </div>
      );
    }
    case 'RULE_APPLY': {
      const appliedCount = res.appliedCount ?? 0;
      return (
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-2xs font-semibold text-slate-800 dark:text-slate-200">
          Applied to {String(appliedCount)} transaction{appliedCount === 1 ? '' : 's'}
        </div>
      );
    }
    default: {
      const scalarEntries = Object.entries(res)
        .filter(([_, v]) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')
        .slice(0, 8);

      if (scalarEntries.length === 0) {
        return (
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 text-2xs font-mono text-slate-500">
            {JSON.stringify(res)}
          </div>
        );
      }

      return (
        <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-2xs grid grid-cols-2 gap-2 font-mono">
          {scalarEntries.map(([k, v]) => (
            <div key={k} className="truncate">
              <span className="text-slate-500">{k}: </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{String(v)}</span>
            </div>
          ))}
        </div>
      );
    }
  }
}
