'use client';

import { useCallback, useRef, useState } from 'react';

import { runAdHocReport } from '@/features/reports/actions';
import { DEFAULT_PAGE_SIZE } from '@/features/reports/view/format';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { asReportData } from '@/lib/reports.helpers';
import type { ReportData, RunReportRequest, SortClause } from '@/lib/reports.types';

/** What the preview is showing: the result and the exact run (definition, page, size, sort) that produced it. */
export interface Shown {
  data: ReportData;
  /** The exact request the run was made for: paging and sorting a stale result re-run this, not the edited draft. */
  request: RunReportRequest;
  /** The serialized definition the run was made for; compared with the draft's to tell whether it went stale. */
  signature: string;
  page: number;
  size: number;
  /** The header sort of a table run; null = the report's own order. */
  sort: SortClause | null;
}

export interface PreviewState {
  shown: Shown | null;
  loading: boolean;
  error: string | null;
  /** The draft has changed since the shown run. */
  stale: boolean;
  /** Runs the draft (page 0 once it changed, else the page on screen). */
  run: () => void;
  changePage: (page: number) => void;
  changeSize: (size: number) => void;
  changeSort: (sort: SortClause | null) => void;
  /** Back to the empty state: no result, no error, and any run still in flight is ignored. */
  clear: () => void;
}

/**
 * The on-demand preview. Nothing runs by itself: the Preview button, a page change, a size change or a header
 * sort fires one request for the current draft. `initial` is a run the server already made (a saved report
 * opens on its result), so the first render needs no request. A slower, superseded response never replaces a
 * newer one on screen.
 */
export function useReportPreview({
  request,
  signature,
  valid,
  initial,
}: {
  request: RunReportRequest;
  signature: string;
  /** The draft has no validation issues. An invalid draft runs nothing, not even a page or sort of an older result. */
  valid: boolean;
  initial?: Pick<Shown, 'data' | 'request' | 'signature'> | null;
}): PreviewState {
  const [shown, setShown] = useState<Shown | null>(
    initial ? { ...initial, page: 0, size: DEFAULT_PAGE_SIZE, sort: null } : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const stale = shown !== null && shown.signature !== signature;

  const fire = useCallback(
    async (req: RunReportRequest, sig: string, page: number, size: number, sort: SortClause | null) => {
      if (!valid) return;
      const isTable = req.type === 'TABLE';
      const id = ++latest.current;
      setLoading(true);
      setError(null);
      try {
        const data = await unwrapAction(
          runAdHocReport(req, isTable ? { page, size, ...(sort ? { sort: `${sort.key},${sort.direction}` } : {}) } : {}),
        );
        if (id !== latest.current) return;
        setShown({ data: asReportData(data), request: req, signature: sig, page, size, sort });
      } catch (e) {
        if (id !== latest.current) return;
        setError(getErrorMessage(e, "Couldn't run the report. Try again."));
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [valid],
  );

  // Preview runs the draft (from page 0 once it changed). Paging and sorting belong to the result on screen, so
  // they re-run ITS definition, stale or not: the draft is only run by Preview.
  const size = shown?.size ?? DEFAULT_PAGE_SIZE;
  const again = (page: number, nextSize: number, sort: SortClause | null) => {
    if (shown) void fire(shown.request, shown.signature, page, nextSize, sort);
  };

  return {
    shown,
    loading,
    error,
    stale,
    run: () => void fire(request, signature, stale || !shown ? 0 : shown.page, size, stale || !shown ? null : shown.sort),
    changePage: (p) => again(p, size, shown?.sort ?? null),
    changeSize: (s) => again(0, s, shown?.sort ?? null),
    changeSort: (s) => again(0, size, s),
    clear: () => {
      latest.current++;
      setShown(null);
      setError(null);
      setLoading(false);
    },
  };
}
