'use client';

// Live preview. Debounces a serialized signature of the definition and runs it
// ad-hoc; a monotonic runId guard ensures a stale debounced response can never
// overwrite a newer one. Table paging (page/size) is a runtime concern only and
// resets to page 0 whenever the definition changes.

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { runAdHocReport } from '@/actions/reports';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isChartData, isKpiData, isTableData } from '@/lib/reports.helpers';
import type {
  DatasourceCatalog,
  ReportData,
  RunReportRequest,
} from '@/lib/reports.types';

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
  const request = buildRunRequest(state, catalog);
  const defSignature = JSON.stringify(request);

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

  const runIdRef = useRef(0);

  // Reset paging when the definition itself changes (not on page change). Done
  // during render — the supported pattern for deriving state from changing props.
  const [lastSignature, setLastSignature] = useState(defSignature);
  if (lastSignature !== defSignature) {
    setLastSignature(defSignature);
    setPage(0);
  }

  useEffect(() => {
    if (!valid) return; // render shows the configuration hint; no run needed
    const myId = ++runIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const opts = isTable ? { page, size } : {};
      const req = JSON.parse(defSignature) as RunReportRequest;
      const res = await runAdHocReport(req, opts);
      if (myId !== runIdRef.current) return; // superseded by a newer run
      setLoading(false);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setData(null);
        setError(res.error.message);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [defSignature, page, valid, size, isTable]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Live preview
        </h2>
        {valid && loading && (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        )}
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
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Running…
        </div>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : undefined}>
          {isKpiData(data) && <KpiView data={data} />}
          {isChartData(data) && <ChartView data={data} />}
          {isTableData(data) && <TableView data={data} onPageChange={setPage} />}
        </div>
      )}
    </div>
  );
}
