'use client';

// On-demand preview. Data is fetched only when the user clicks "Preview" (and
// when paging a table — itself a deliberate action), never automatically on
// config changes. The one exception is editing a saved report: the definition
// is known-good, so it runs once on mount (autoRunOnMount) — after that, edits
// go back through the button. Once data is shown, changing the config marks it
// stale: an overlay covers the result and the Preview button re-enables.
//
// The exact params a run was fired with (`runKey`) are held in state and fed
// straight into the query key, rather than reading `page`/`size` off render
// state inside the fetch itself. That keeps a slower, superseded run's
// response from ever clobbering a newer one on screen: TanStack Query only
// ever surfaces the result for the key this component is currently pointed
// at, so an out-of-order response for an old key lands in a cache entry
// nobody's subscribed to.

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { asReportData } from '@/lib/reports.helpers';
import type { DatasourceCatalog, RunReportRequest } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

import type { BuilderState } from './builderReducer';
import { buildRunRequest, validationErrors } from './serialize';
import { ReportDataView } from './views/ReportDataView';
import { DEFAULT_TABLE_PAGE_SIZE } from './views/TablePagination';

interface PreviewPaneProps {
  state: BuilderState;
  catalog: DatasourceCatalog;
  autoRunOnMount?: boolean;
}

interface RunKey {
  /** Serialised definition this run was fired for — compared against the live
   * `defSignature` to decide whether the shown data is stale. */
  signature: string;
  request: RunReportRequest;
  page: number;
  size: number;
}

export function PreviewPane({ state, catalog, autoRunOnMount = false }: PreviewPaneProps) {
  // `ReportBuilder` holds one reducer for the whole page, so typing in the Name
  // or Description field re-renders this component even though neither is part
  // of the definition. Without memoisation that re-ran validation and a full
  // definition serialisation on every keystroke.
  const { request, defSignature } = useMemo(() => {
    const req = buildRunRequest(state, catalog);
    return { request: req, defSignature: JSON.stringify(req) };
  }, [state, catalog]);

  const errors = useMemo(
    () => validationErrors(state, catalog),
    [state, catalog],
  );
  const valid = errors.length === 0;

  const isTable = state.type === 'TABLE';

  const [page, setPage] = useState(0);
  // Page size is a runtime concern (not part of the definition); preview drives
  // it from the table footer's page-size control.
  const [size, setSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  // The last run the user actually asked for. Null until the first run.
  const [runKey, setRunKey] = useState<RunKey | null>(null);

  // Reset paging when the definition changes (render-time derived-state pattern).
  const [lastSignature, setLastSignature] = useState(defSignature);
  if (lastSignature !== defSignature) {
    setLastSignature(defSignature);
    setPage(0);
  }

  const query = useQuery({
    // `runKey` (the whole object) and `isTable` are both in the key, not just
    // the fields the query params need, so the key stays exhaustive over
    // everything queryFn reads below (including `runKey.request`).
    queryKey: keys.reports.run(state.reportId ?? 'draft', { runKey, isTable }),
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/reports/data', {
        params: { query: isTable ? { page: runKey!.page, size: runKey!.size } : {} },
        body: { ...runKey!.request, definition: { ...runKey!.request.definition } },
      });
      return asReportData(data);
    },
    enabled: runKey !== null,
    placeholderData: keepPreviousData,
  });

  const data = query.data ?? null;
  const loading = query.isFetching;
  const error = query.isError
    ? query.error instanceof ApiError
      ? query.error.response.message
      : 'Failed to run ad-hoc report'
    : null;

  // Data is shown but the config has since changed → it no longer matches.
  const isStale = data !== null && runKey !== null && runKey.signature !== defSignature;
  // Worth (re)loading: valid, not already loading, and nothing fresh on screen.
  const canPreview = valid && !loading && (data === null || isStale || query.isError);

  const startRun = (pageToLoad: number, sizeToLoad: number) => {
    if (!valid) return;
    setRunKey({ signature: defSignature, request, page: pageToLoad, size: sizeToLoad });
  };

  const runPreview = () => startRun(page, size);

  // Edit mode: the saved definition is known-good, so load it once on mount.
  // Guarded by a ref (not effect deps) so later config changes never re-trigger it.
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRunOnMount && valid && !autoRanRef.current) {
      autoRanRef.current = true;
      startRun(page, size);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (p: number) => {
    setPage(p);
    startRun(p, size);
  };

  const handleSizeChange = (s: number) => {
    setSize(s);
    setPage(0);
    startRun(0, s);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Preview
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => runPreview()}
          disabled={!canPreview}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Preview
        </Button>
      </div>

      {!valid ? (
        <Alert variant="info">
          <AlertTitle>Finish configuring the report</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not run report</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !data ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running…
            </>
          ) : (
            'Click Preview to run this report.'
          )}
        </div>
      ) : (
        <div className="relative">
          <div className={cn(loading && 'opacity-60 transition-opacity')}>
            <ReportDataView
              data={data}
              loading={loading}
              onPageChange={handlePageChange}
              onSizeChange={handleSizeChange}
            />
          </div>

          {isStale && !loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1px] dark:bg-slate-900/70">
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Configuration changed
                </p>
                <Button size="sm" onClick={() => runPreview()}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh preview
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
