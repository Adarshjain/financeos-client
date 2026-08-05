'use client';

import { ShieldAlert } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { ReconciledExecution,ReconcilePreview } from '@/lib/types';

interface ReconciliationSummaryStatsProps {
  reconcilePreview: ReconcilePreview;
  unresolvedRows: ReconciledExecution[];
  unresolvedScrips: string[];
  onSkipUnmappedRows: () => void;
}

export function ReconciliationSummaryStats({
  reconcilePreview,
  unresolvedRows,
  unresolvedScrips,
  onSkipUnmappedRows,
}: ReconciliationSummaryStatsProps) {
  return (
    <>
      {/* Summary counters */}
      <div className="shrink-0 grid grid-cols-4 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2 rounded bg-slate-100 dark:bg-slate-900">
          <div className="text-[10px] text-slate-500">Executions</div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">
            {reconcilePreview.summaryStats.totalExecutions}
          </div>
        </div>
        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
          <div className="text-[10px]">CNC / MIS</div>
          <div className="font-bold text-sm">
            {reconcilePreview.summaryStats.deliveryExecutions} / {reconcilePreview.summaryStats.intradayExecutions}
          </div>
        </div>
        <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
          <div className="text-[10px]">Warns / Gaps</div>
          <div className="font-bold text-sm">{reconcilePreview.summaryStats.warningsCount}</div>
        </div>
        <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
          <div className="text-[10px]">Duplicates</div>
          <div className="font-bold text-sm">{reconcilePreview.summaryStats.duplicates}</div>
        </div>
      </div>

      {/* Unresolved Instruments Red Banner */}
      {unresolvedRows.length > 0 && (
        <div className="shrink-0 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-[11px] text-red-900 dark:text-red-300">
          <div className="font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-red-800 dark:text-red-200">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                {unresolvedRows.length} execution{unresolvedRows.length > 1 ? 's have' : ' has'} no instrument mapped and will NOT be imported. Map each below, or exclude them.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSkipUnmappedRows}
              className="text-[10px] h-6 px-2 border-red-300 text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 shrink-0"
            >
              Skip unmapped rows
            </Button>
          </div>
          {unresolvedScrips.length > 0 && (
            <div className="mt-1 text-[10px] text-red-700 dark:text-red-400 font-mono">
              Unmapped scrips: {unresolvedScrips.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Warnings / Data Gaps Banner */}
      {reconcilePreview.warnings.length > 0 && (
        <div className="shrink-0 space-y-1 max-h-24 overflow-y-auto p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300">
          <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Reconciliation Alerts & Flags:
          </div>
          <ul className="space-y-1 pl-5 list-disc">
            {reconcilePreview.warnings.map((w, idx) => (
              <li key={idx} className="leading-tight">
                <span className="font-semibold mr-1">[{w.type}]:</span>
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
