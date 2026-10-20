'use client';

import React from 'react';

import { Text } from '@/components/ds';
import type { ImportCommitResult as ImportCommitData } from '@/lib/types';

import { ResultSection } from './ResultSection';

function rowLabel(rowIndex: number, scrip?: string | null): string {
  return `Row ${rowIndex}${scrip ? ` · ${scrip}` : ''}`;
}

/** Import and reconcile commit result: counts plus every skipped and failed row with its reason. */
export function ImportCommitResult({ result }: { result: ImportCommitData }) {
  const failed = Array.isArray(result.failed) ? result.failed : [];
  const skippedItems = Array.isArray(result.skippedItems) ? result.skippedItems : [];
  const committed = result.committed ?? 0;

  return (
    <div className="flex flex-col gap-space-8" data-testid="import-commit-result">
      <Text variant="body-strong" as="p">
        Imported {committed} row{committed === 1 ? '' : 's'}; {result.skipped ?? 0} skipped; {failed.length} failed.
      </Text>

      <ResultSection title="Failed" count={failed.length} defaultOpen tone="danger">
        {failed.map((f, i) => (
          <Text key={`${f.rowIndex}-${i}`} variant="body" as="p">
            <strong>{rowLabel(f.rowIndex, f.scrip)}</strong>: {f.reason || 'Unknown error'}
          </Text>
        ))}
      </ResultSection>

      <ResultSection title="Skipped" count={skippedItems.length}>
        {skippedItems.map((s, i) => (
          <Text key={`${s.rowIndex}-${i}`} variant="body" as="p">
            <strong>{rowLabel(s.rowIndex, s.scrip)}</strong>: {s.reason}
          </Text>
        ))}
      </ResultSection>
    </div>
  );
}
