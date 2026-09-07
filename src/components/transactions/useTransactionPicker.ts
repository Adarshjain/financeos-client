'use client';

import * as React from 'react';

import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { FilterClause } from '@/lib/reports.types';
import { parseCalendarDate, toCalendarDate } from '@/lib/utils';

/** Search-result shape: the full generated response, so `obligationRefs` and
 *  `links` (needed for client-side filtering) are available — the hand-rolled
 *  `Transaction` type in transaction.types.ts doesn't declare `obligationRefs`. */
export type PickerTransaction = Schemas['TransactionResponse'];

const DATE_WINDOW_DAYS = 30;

interface UseTransactionPickerProps {
  direction: 'lent' | 'borrowed';
  suggestAmount?: number | null;
  suggestDate?: string | null;
  excludeIds?: string[];
  /** Only fetch/debounce while the search UI is actually visible. */
  active: boolean;
}

export function useTransactionPicker({
  direction,
  suggestAmount,
  suggestDate,
  excludeIds,
  active,
}: UseTransactionPickerProps) {
  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<PickerTransaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const requestIdRef = React.useRef(0);

  const fetchResults = React.useCallback(
    async (query: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const filters: FilterClause[] = [
          { field: 'type', operator: 'is', value: direction === 'lent' ? 'DEBIT' : 'CREDIT' },
        ];

        // Date-window filter: the transactions/search endpoint (via the shared
        // report-catalog operator set) supports 'between' for DATE fields with
        // an ISO { from, to } value — see TransactionListQueryBuilder.java,
        // which delegates DATE predicates to SqlPredicates/DatasourceCatalog,
        // whose DATE operator list includes 'between'.
        if (suggestDate) {
          const anchor = parseCalendarDate(suggestDate);
          const from = new Date(anchor);
          from.setDate(from.getDate() - DATE_WINDOW_DAYS);
          const to = new Date(anchor);
          to.setDate(to.getDate() + DATE_WINDOW_DAYS);
          filters.push({
            field: 'date',
            operator: 'between',
            value: { from: toCalendarDate(from), to: toCalendarDate(to) },
          });
        }

        const { data } = await api.POST('/api/v1/transactions/search', {
          body: { filters, search: query.trim() || null },
          params: { query: { page: 0, size: 50 } },
        });
        if (requestId !== requestIdRef.current) return;
        setResults(data?.content ?? []);
      } catch {
        // Ignore background errors — the empty state covers this.
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [direction, suggestDate],
  );

  React.useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => fetchResults(search), 300);
    return () => clearTimeout(timer);
  }, [active, search, fetchResults]);

  React.useEffect(() => {
    if (!active) setSearch('');
  }, [active]);

  const candidates = React.useMemo(() => {
    const excludeSet = new Set(excludeIds ?? []);
    const filtered = results.filter((t) => {
      if (excludeSet.has(t.id)) return false;
      if (t.links && t.links.length > 0) return false;
      // A transaction already claimed by a LOAN-side obligation is off-limits;
      // one already shared across other LENDING entries (split bills) is fine.
      if (t.obligationRefs?.some((r) => r.kind !== 'LENDING')) return false;
      return true;
    });

    const suggestAmt = suggestAmount != null ? Math.abs(suggestAmount) : null;
    const suggestDateMs = suggestDate ? parseCalendarDate(suggestDate).getTime() : null;

    return [...filtered].sort((a, b) => {
      if (suggestAmt != null) {
        const aExact = Math.abs(a.amount) === suggestAmt ? 0 : 1;
        const bExact = Math.abs(b.amount) === suggestAmt ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
      }
      if (suggestDateMs != null) {
        const aDiff = Math.abs(parseCalendarDate(a.date).getTime() - suggestDateMs);
        const bDiff = Math.abs(parseCalendarDate(b.date).getTime() - suggestDateMs);
        if (aDiff !== bDiff) return aDiff - bDiff;
      }
      return b.date.localeCompare(a.date);
    });
  }, [results, excludeIds, suggestAmount, suggestDate]);

  return { search, setSearch, loading, candidates };
}
