'use client';

// On-demand preview. Data is fetched only when the user clicks "Preview" (and
// when paging a table — itself a deliberate action), never automatically on
// config changes. Once data is shown, changing the config marks it stale: an
// overlay covers the result and the Preview button re-enables. A monotonic runId
// guard ensures a stale in-flight response can't overwrite a newer one.

import { Loader2, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';

import { runAdHocReport } from '@/actions/reports';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { isChartData, isKpiData, isTableData } from '@/lib/reports.helpers';
import type {
  DatasourceCatalog,
  ReportData,
  RunReportRequest,
} from '@/lib/reports.types';
import { cn } from '@/lib/utils';

import type { BuilderState } from './builderReducer';
import { buildRunRequest, isMinimalValid, validationErrors } from './serialize';
import { ChartView } from './views/ChartView';
import { KpiView } from './views/KpiView';
import { TableView } from './views/TableView';

interface PreviewPaneProps {
  state: BuilderState;
  catalog: DatasourceCatalog;
}

export function PreviewPane({ state, catalog }: PreviewPaneProps) {
  const valid = isMinimalValid(state, catalog);
  const errors = validationErrors(state, catalog);
  const defSignature = JSON.stringify(buildRunRequest(state, catalog));

  const isTable = state.type === 'TABLE';
  const size = isTable
    ? state.table.tableMode === 'raw'
      ? state.table.raw.pageSize
      : state.table.agg.pageSize
    : undefined;

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  // Signature the currently-shown data was fetched for; null until first load.
  const [loadedSignature, setLoadedSignature] = useState<string | null>(null);
  const runIdRef = useRef(0);

  // Reset paging when the definition changes (render-time derived-state pattern).
  const [lastSignature, setLastSignature] = useState(defSignature);
  if (lastSignature !== defSignature) {
    setLastSignature(defSignature);
    setPage(0);
  }

  // Data is shown but the config has since changed → it no longer matches.
  const isStale = data !== null && loadedSignature !== defSignature;
  // Worth (re)loading: valid, not already loading, and nothing fresh on screen.
  const canPreview = valid && !loading && (data === null || isStale);

  const runPreview = async (pageToLoad = page) => {
    if (!valid) return;
    const myId = ++runIdRef.current;
    const signature = defSignature;
    setLoading(true);
    const req = JSON.parse(signature) as RunReportRequest;
    const res = await runAdHocReport(
      req,
      isTable ? { page: pageToLoad, size } : {},
    );
    if (myId !== runIdRef.current) return; // superseded by a newer run
    setLoading(false);
    if (res.success) {
      setData(res.data);
      setError(null);
      setLoadedSignature(signature);
    } else {
      setData(null);
      setError(res.error.message);
      setLoadedSignature(null);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    void runPreview(p);
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
          onClick={() => void runPreview()}
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
            {isKpiData(data) && <KpiView data={data} />}
            {isChartData(data) && <ChartView data={data} />}
            {isTableData(data) && (
              <TableView data={data} onPageChange={handlePageChange} />
            )}
          </div>

          {isStale && !loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1px] dark:bg-slate-900/70">
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Configuration changed
                </p>
                <Button size="sm" onClick={() => void runPreview()}>
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
