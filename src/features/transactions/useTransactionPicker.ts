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
const PAGE_SIZE = 50;

interface UseTransactionPickerProps {
  direction?: 'lent' | 'borrowed';
  /** Overrides the direction-derived type filter. `null` means no type
   *  filter at all (e.g. a loan rate-change rarely has a cash movement, but
   *  the capability to link one still needs to stay open). Omit to fall
   *  back to the direction-derived DEBIT/CREDIT filter. */
  type?: 'DEBIT' | 'CREDIT' | null;
  suggestAmount?: number | null;
  suggestDate?: string | null;
  excludeIds?: string[];
  /** Loan links are exclusive: a transaction already referenced by ANY
   *  obligation (loan or lending) disqualifies it for a loan link — unlike
   *  the default lending rule, which still allows a row already shared
   *  across other LENDING refs (split bills). */
  excludeAnyObligationRef?: boolean;
  /** Which obligation family may already share the row. Lending entries may
   *  share a credit/debit (split bills); dividend rows may share a credit (an
   *  interim + special payout paid together). Anything referenced by another
   *  family is off-limits. Ignored when `excludeAnyObligationRef` is set. */
  shareableKind?: 'LENDING' | 'DIVIDEND';
  /** Only fetch/debounce while the search UI is actually visible. */
  active: boolean;
}

export function useTransactionPicker({
  direction,
  type,
  suggestAmount,
  suggestDate,
  excludeIds,
  excludeAnyObligationRef = false,
  shareableKind = 'LENDING',
  active,
}: UseTransactionPickerProps) {
  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<PickerTransaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [totalPages, setTotalPages] = React.useState(0);
  // "Load more" asks for the next page of the same search; any change of search or filter starts over.
  const [paging, setPaging] = React.useState({ key: '', page: 0 });
  // The request (search and page) whose answer is in `results`: until it arrives the list is not final.
  const [settled, setSettled] = React.useState('');
  const requestIdRef = React.useRef(0);

  const searchKey = `${search}|${direction ?? ''}|${type ?? ''}|${suggestDate ?? ''}`;
  const page = paging.key === searchKey ? paging.page : 0;

  const fetchResults = React.useCallback(
    async (query: string, pageNo: number, key: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const effectiveType: 'DEBIT' | 'CREDIT' | null =
          type !== undefined
            ? type
            : direction === 'lent'
              ? 'DEBIT'
              : direction === 'borrowed'
                ? 'CREDIT'
                : null;

        const filters: FilterClause[] = [];
        if (effectiveType) {
          filters.push({ field: 'type', operator: 'is', value: effectiveType });
        }

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
          params: { query: { page: pageNo, size: PAGE_SIZE } },
        });
        if (requestId !== requestIdRef.current) return;
        const content = data?.content ?? [];
        setResults((prev) => (pageNo === 0 ? content : [...prev, ...content]));
        setTotalPages(data?.totalPages ?? 1);
      } catch {
        // Ignore background errors — the empty state covers this.
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setSettled(key);
        }
      }
    },
    [direction, type, suggestDate],
  );

  React.useEffect(() => {
    if (!active) return;
    // A typed search waits for a pause; the next page of the same search goes straight out.
    const timer = setTimeout(() => fetchResults(search, page, `${searchKey}|${page}`), page === 0 ? 300 : 0);
    return () => clearTimeout(timer);
  }, [active, search, page, searchKey, fetchResults]);

  React.useEffect(() => {
    if (!active) setSearch('');
  }, [active]);

  // Paging belongs to one search: a new search or filter, or closing the picker, starts over at page 0 so an
  // old page number is never picked up again when the key comes back (type then delete, close then reopen).
  React.useEffect(() => {
    setPaging({ key: searchKey, page: 0 });
  }, [searchKey, active]);

  const candidates = React.useMemo(() => {
    const excludeSet = new Set(excludeIds ?? []);
    const filtered = results.filter((t) => {
      if (excludeSet.has(t.id)) return false;
      if (t.links && t.links.length > 0) return false;
      if (excludeAnyObligationRef) {
        // Loan links are exclusive — ANY obligation ref (loan or lending)
        // disqualifies the row.
        if (t.obligationRefs && t.obligationRefs.length > 0) return false;
      } else if (t.obligationRefs?.some((r) => r.kind !== shareableKind)) {
        // A transaction already claimed by another family (loan rows, or
        // lending vs dividend) is off-limits; one already shared across other
        // rows of the same shareable family is fine.
        return false;
      }
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
  }, [results, excludeIds, suggestAmount, suggestDate, excludeAnyObligationRef, shareableKind]);

  // True from opening (or typing) until the answer for the current search and page is in.
  const pending = active && settled !== `${searchKey}|${page}`;
  const hasMore = page + 1 < totalPages;
  const loadMore = React.useCallback(() => {
    setPaging({ key: searchKey, page: page + 1 });
  }, [searchKey, page]);

  return { search, setSearch, loading, pending, candidates, hasMore, loadMore };
}
