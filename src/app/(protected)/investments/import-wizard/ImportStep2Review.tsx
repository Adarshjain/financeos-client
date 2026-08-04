'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { ImportPreview, ReconcilePreview } from '@/lib/types';
import { ClassifiedExecutionsTable } from './ClassifiedExecutionsTable';
import { DerivedHoldingsTable } from './DerivedHoldingsTable';
import { ReconciliationSummaryStats } from './ReconciliationSummaryStats';
import { ImportMode, isRowResolved, RowState } from './types';

interface ImportStep2ReviewProps {
  mode: ImportMode;
  reconcilePreview: ReconcilePreview | null;
  casPreview: ImportPreview | null;
  rowStates: Record<number, RowState>;
  setRowStates: React.Dispatch<React.SetStateAction<Record<number, RowState>>>;
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
    ? reconcilePreview.executions.filter((e) => {
        const s = rowStates[e.rowIndex] || {};
        return !s.skip && isRowResolved(s, e);
      }).length
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

          {/* Scrollable Holdings & Executions Area */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
            <DerivedHoldingsTable holdings={reconcilePreview.derivedHoldings} />
            <ClassifiedExecutionsTable
              executions={reconcilePreview.executions}
              rowStates={rowStates}
              onToggleSkip={handleToggleSkip}
              onMapInstrument={handleMapInstrument}
            />
          </div>
        </>
      )}

      <DialogFooter className="pt-2 gap-2 shrink-0 flex-col-reverse sm:flex-row sm:justify-end sm:items-center">
        {unresolvedRows.length > 0 && (
          <span className="text-[11px] text-red-600 dark:text-red-400 font-medium mr-auto">
            ⛔ {unresolvedRows.length} row{unresolvedRows.length > 1 ? 's need' : ' needs'} an instrument — map or skip them
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="text-xs w-full sm:w-auto"
        >
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onCommit}
          disabled={isCommitting || unresolvedRows.length > 0}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto disabled:opacity-50"
        >
          {isCommitting
            ? 'Importing Reconciled Executions...'
            : `Import Confirmed Trades (${mode === 'mf_cas' ? casConfirmableCount : confirmableCount})`}
        </Button>
      </DialogFooter>
    </div>
  );
}
