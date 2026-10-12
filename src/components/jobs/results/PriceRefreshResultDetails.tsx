import React from 'react';

import type { PriceRefreshResult } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

import { RESULT_CARD, ResultSection } from './ResultSection';

export function PriceRefreshResultDetails({ result }: { result: PriceRefreshResult }) {
  const refreshed = result.refreshed ?? 0;
  const skipped = result.skipped ?? 0;
  const asOf = result.asOf ? formatDate(String(result.asOf)) : 'today';
  const failed = Array.isArray(result.failed) ? result.failed : [];
  const updated = result.refreshedItems ?? [];
  const skippedItems = result.skippedItems ?? [];

  return (
    <div className={RESULT_CARD}>
      <div className="font-semibold text-slate-800 dark:text-slate-200">
        Updated {refreshed} price{refreshed === 1 ? '' : 's'} (as of {asOf}); {skipped} skipped
        {failed.length > 0 && `; ${failed.length} failed`}.
      </div>

      <ResultSection title="Failed" count={failed.length} defaultOpen tone="danger">
        {failed.map((f, i) => (
          <li key={f.instrumentId ?? i} className="break-words">
            <span className="font-medium">{f.instrumentName || f.instrumentId}</span>: {f.reason}
          </li>
        ))}
      </ResultSection>

      <ResultSection title="Skipped" count={skippedItems.length}>
        {skippedItems.map((s) => (
          <li key={s.instrumentId} className="break-words">
            <span className="font-medium">{s.instrumentName || s.instrumentId}</span>: {s.reason}
          </li>
        ))}
      </ResultSection>

      <ResultSection title="Updated" count={updated.length}>
        {updated.map((u) => (
          <li key={u.instrumentId} className="flex items-center justify-between gap-2">
            <span className="truncate">{u.instrumentName || u.instrumentId}</span>
            <span className="tabular-nums shrink-0 text-slate-500">
              <span className="text-slate-800 dark:text-slate-200">{formatCurrency(u.close)}</span> · {formatDate(u.priceDate)} ·{' '}
              {u.source}
            </span>
          </li>
        ))}
      </ResultSection>
    </div>
  );
}
