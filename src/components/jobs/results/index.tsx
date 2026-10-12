'use client';

import React from 'react';

import type {
  FileIngestionResult,
  ImportCommitResult,
  JobResponse,
  PriceRefreshResult,
  RuleApplyResult,
  SyncSummary,
} from '@/lib/types';

import { GmailSyncResultDetails } from './GmailSyncResultDetails';
import { ImportCommitResultDetails } from './ImportCommitResultDetails';
import { IngestionResultDetails } from './IngestionResultDetails';
import { PriceRefreshResultDetails } from './PriceRefreshResultDetails';
import { RuleApplyResultDetails } from './RuleApplyResultDetails';

export function JobResultDetails({ job }: { job: JobResponse }) {
  if (!job.result || typeof job.result !== 'object') {
    if (job.result != null) {
      return <div className="text-2xs font-medium text-slate-700 dark:text-slate-300">{String(job.result)}</div>;
    }
    return null;
  }

  const raw: unknown = job.result;
  const res = job.result as Record<string, unknown>;

  switch (job.type) {
    case 'STATEMENT_INGEST':
      return <IngestionResultDetails result={raw as FileIngestionResult} />;
    case 'GMAIL_SYNC':
      return <GmailSyncResultDetails result={raw as SyncSummary} />;
    case 'PRICE_REFRESH':
      return <PriceRefreshResultDetails result={raw as PriceRefreshResult} />;
    case 'INVESTMENT_IMPORT_COMMIT':
    case 'BROKER_RECONCILE_COMMIT':
      return <ImportCommitResultDetails result={raw as ImportCommitResult} />;
    case 'RULE_APPLY':
      return <RuleApplyResultDetails result={raw as RuleApplyResult} />;
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
