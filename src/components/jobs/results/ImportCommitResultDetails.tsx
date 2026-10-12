import React from 'react';

import type { ImportCommitResult } from '@/lib/types';

import { RESULT_CARD, ResultSection } from './ResultSection';

function rowLabel(rowIndex: number, scrip?: string | null): string {
  return `Row ${rowIndex}${scrip ? ` · ${scrip}` : ''}`;
}

/** INVESTMENT_IMPORT_COMMIT / BROKER_RECONCILE_COMMIT result: counts plus every skipped and failed row with its reason. */
export function ImportCommitResultDetails({ result }: { result: ImportCommitResult }) {
  const failed = Array.isArray(result.failed) ? result.failed : [];
  const skippedItems = Array.isArray(result.skippedItems) ? result.skippedItems : [];
  const committed = result.committed ?? 0;

  return (
    <div className={RESULT_CARD}>
      <div className="font-semibold text-slate-800 dark:text-slate-200">
        Imported {committed} row{committed === 1 ? '' : 's'}; {result.skipped ?? 0} skipped; {failed.length} failed.
      </div>

      <ResultSection title="Failed" count={failed.length} defaultOpen tone="danger">
        {failed.map((f, i) => (
          <li key={`${f.rowIndex}-${i}`} className="break-words">
            <span className="font-medium">{rowLabel(f.rowIndex, f.scrip)}</span>: {f.reason || 'Unknown error'}
          </li>
        ))}
      </ResultSection>

      <ResultSection title="Skipped" count={skippedItems.length}>
        {skippedItems.map((s, i) => (
          <li key={`${s.rowIndex}-${i}`} className="break-words">
            <span className="font-medium">{rowLabel(s.rowIndex, s.scrip)}</span>: {s.reason}
          </li>
        ))}
      </ResultSection>
    </div>
  );
}
