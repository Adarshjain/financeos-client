'use client';

import React from 'react';

import {
  Banner,
  Card,
  GRID_GAP,
  KpiTile,
  Text,
} from '@/components/ds';
import type { ImportCommitResult } from '@/lib/types';

const lineOf = (item: { rowIndex: number; scrip?: string | null; reason: string }) =>
  `#${item.rowIndex} ${item.scrip ? `${item.scrip} — ` : ''}${item.reason}`;

/** Step 3: what the import did: the counters, and a line for each failed and skipped row. */
export function ResultStep({ result, brokerName }: { result: ImportCommitResult; brokerName: string }) {
  const failed = result.failed ?? [];
  const skipped = result.skippedItems ?? [];
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card>
        <div className="flex flex-col items-center gap-space-4 p-space-20 text-center">
          <Text variant="title" as="h2">
            Broker import reconciliation complete
          </Text>
          <Text variant="body" tone="ink-3" as="p">
            Successfully processed import for <strong>{brokerName}</strong>.
          </Text>
        </div>
      </Card>
      <div className={`grid grid-cols-3 ${GRID_GAP}`}>
        <KpiTile label="Committed" value={result.committed} />
        <KpiTile label="Skipped" value={result.skipped} />
        <KpiTile label="Failed" value={failed.length} />
      </div>
      {failed.length > 0 ? (
        <Banner tone="danger" title={`Failed executions (${failed.length})`}>
          {failed.map((f, i) => (
            <p key={i}>{lineOf(f)}</p>
          ))}
        </Banner>
      ) : null}
      {skipped.length > 0 ? (
        <Banner tone="neutral" title={`Skipped executions (${skipped.length})`}>
          {skipped.map((s, i) => (
            <p key={i}>{lineOf(s)}</p>
          ))}
        </Banner>
      ) : null}
    </div>
  );
}
