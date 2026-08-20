'use client';

import React from 'react';

import { Button } from '@/components/ui/button';
import { ImportPreview, ReconcilePreview } from '@/lib/types';

import { ClassifiedExecutionsTable } from './ClassifiedExecutionsTable';
import { FnoTradesTable } from './FnoTradesTable';
import { ReconciliationSummaryStats } from './ReconciliationSummaryStats';
import { ImportMode, isRowResolved, RowState } from './types';

interface ImportStep2ReviewProps {
  mode: ImportMode;
  reconcilePreview: ReconcilePreview | null;
  casPreview: ImportPreview | null;
  rowStates: Record<number, RowState>;
  setRowStates: React.Dispatch<React.SetStateAction<Record<number, RowState>>>;
  fnoRowStates: Record<number, { skip: boolean }>;
  setFnoRowStates: React.Dispatch<React.SetStateAction<Record<number, { skip: boolean }>>>;
  isCommitting: boolean;
  onBack: () => void;
  onCommit: () => void;
}

export function ImportStep2Review({
  mode,
  reconcilePreview,
  casPreview,
  rowStates,
  setRowStates,
  fnoRowStates,
  setFnoRowStates,
  isCommitting,
  onBack,
  onCommit,
}: ImportStep2ReviewProps) {
  if (!reconcilePreview && !casPreview) return null;

  const unresolvedRows = reconcilePreview
    ? reconcilePreview.executions.filter((e) => {
        const s = rowStates[e.rowIndex];
        return !s?.skip && !isRowResolved(s, e);
      })
    : [];

  const unresolvedScrips = Array.from(new Set(unresolvedRows.map((e) => e.symbol)));

  const confirmableCount = reconcilePreview
    ? (reconcilePreview.executions.filter((e) => {
        const s = rowStates[e.rowIndex] || {};
        return !s.skip && isRowResolved(s, e);
      }).length +
      (reconcilePreview.fnoTrades || []).filter((_, idx) => !fnoRowStates[idx]?.skip).length)
    : 0;

  const casConfirmableCount = casPreview
    ? casPreview.rows.filter((r) => {
        const s = rowStates[r.rowIndex] || {};
        return !s.skip && (s.selectedInstrumentId || r.matchedInstrument);
      }).length
    : 0;

  const handleSkipUnmappedRows = () => {
    setRowStates((prev) => {
      const next = { ...prev };
      unresolvedRows.forEach((r) => {
        next[r.rowIndex] = { ...(next[r.rowIndex] || {}), skip: true };
      });
      return next;
    });
  };

  const handleToggleSkip = (rowIndex: number, currentSkip: boolean) => {
    setRowStates((prev) => ({
      ...prev,
      [rowIndex]: { ...prev[rowIndex], skip: !currentSkip },
    }));
  };

  const handleToggleFnoSkip = (tradeIndex: number, currentSkip: boolean) => {
    setFnoRowStates((prev) => ({
      ...prev,
      [tradeIndex]: { skip: !currentSkip },
    }));
  };

  const handleMapInstrument = (rowIndex: number, inst: { id: string; name: string }) => {
    setRowStates((prev) => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        selectedInstrumentId: inst.id,
        selectedInstrumentName: inst.name,
        createNew: false,
      },
    }));
  };

  const handleCreateNew = (rowIndex: number, createNew: boolean) => {
    setRowStates((prev) => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        createNew,
        ...(createNew ? { selectedInstrumentId: undefined, selectedInstrumentName: undefined } : {}),
      },
    }));
  };

  const hasExecutions = reconcilePreview && reconcilePreview.executions.length > 0;
  const hasFnoTrades = reconcilePreview && reconcilePreview.fnoTrades && reconcilePreview.fnoTrades.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-2">
      {reconcilePreview && (
        <>
          <ReconciliationSummaryStats
            reconcilePreview={reconcilePreview}
            unresolvedRows={unresolvedRows}
            unresolvedScrips={unresolvedScrips}
            onSkipUnmappedRows={handleSkipUnmappedRows}
          />

          {/* Two-section Scrollable Review Area */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
            {hasExecutions && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Stocks & Delivery Executions
                </h3>
                <ClassifiedExecutionsTable
                  executions={reconcilePreview.executions}
                  rowStates={rowStates}
                  onToggleSkip={handleToggleSkip}
                  onMapInstrument={handleMapInstrument}
                  onCreateNew={handleCreateNew}
                />
              </div>
            )}

            {hasFnoTrades && (
              <div className="space-y-1.5">
                <FnoTradesTable
                  trades={reconcilePreview.fnoTrades!}
                  fnoRowStates={fnoRowStates}
                  onToggleSkip={handleToggleFnoSkip}
                />
              </div>
            )}
          </div>
        </>
      )}

      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-background pt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="w-full sm:w-auto"
        >
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onCommit}
          disabled={isCommitting || unresolvedRows.length > 0}
          className="w-full sm:w-auto"
        >
          {isCommitting
            ? 'Importing Reconciled Executions...'
            : `Import Confirmed Trades (${mode === 'mf_cas' ? casConfirmableCount : confirmableCount})`}
        </Button>
      </div>
    </div>
  );
}
