'use client';

import React from 'react';

import { Text } from '@/components/ds/Text/Text';
import type {
  FileIngestionResult,
  ImportCommitResult as ImportCommitData,
  JobResponse,
  PriceRefreshResult as PriceRefreshData,
  RuleApplyResult as RuleApplyData,
  SyncSummary,
} from '@/lib/types';

import { GmailSyncResult } from '../GmailSyncResult';
import { ImportCommitResult } from './ImportCommitResult';
import { IngestionResult } from './IngestionResult';
import { PriceRefreshResult } from './PriceRefreshResult';
import { RuleApplyResult } from './RuleApplyResult';

/** The full result of a finished job, by type. Unknown shapes show their scalar fields. */
export function JobResultBody({ job }: { job: JobResponse }) {
  if (job.result == null) return null;
  if (typeof job.result !== 'object') {
    return (
      <Text variant="body-strong" as="p">
        {String(job.result)}
      </Text>
    );
  }

  const raw: unknown = job.result;
  switch (job.type) {
    case 'STATEMENT_INGEST':
      return <IngestionResult result={raw as FileIngestionResult} />;
    case 'GMAIL_SYNC':
      return <GmailSyncResult result={raw as SyncSummary} />;
    case 'PRICE_REFRESH':
      return <PriceRefreshResult result={raw as PriceRefreshData} />;
    case 'INVESTMENT_IMPORT_COMMIT':
    case 'BROKER_RECONCILE_COMMIT':
      return <ImportCommitResult result={raw as ImportCommitData} />;
    case 'RULE_APPLY':
      return <RuleApplyResult result={raw as RuleApplyData} />;
    default: {
      const entries = Object.entries(raw as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')
        .slice(0, 8);
      return (
        <div className="grid grid-cols-2 gap-space-6" data-testid="generic-result">
          {entries.length === 0 ? (
            <Text variant="caption" tone="ink-3" mono>
              {JSON.stringify(raw)}
            </Text>
          ) : (
            entries.map(([k, v]) => (
              <Text key={k} variant="caption" mono truncate>
                {k}: <strong>{String(v)}</strong>
              </Text>
            ))
          )}
        </div>
      );
    }
  }
}
