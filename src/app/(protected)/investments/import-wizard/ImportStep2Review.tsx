'use client';

import React from 'react';

import { ImportPreview, ReconcilePreview } from '@/lib/types';

import { ClassifiedExecutionsTable } from './ClassifiedExecutionsTable';
import { FnoTradesTable } from './FnoTradesTable';
import { ReconciliationSummaryStats } from './ReconciliationSummaryStats';
import { getUnresolvedRows, RowState } from './types';

interface ImportStep2ReviewProps {
  reconcilePreview: ReconcilePreview | null;
  casPreview: ImportPreview | null;
  rowStates: Record<number, RowState>;
  setRowStates: React.Dispatch<React.SetStateAction<Record<number, RowState>>>;
  fnoRowStates: Record<number, { skip: boolean }>;
  setFnoRowStates: React.Dispatch<React.SetStateAction<Record<number, { skip: boolean }>>>;
}

export function ImportStep2Review({
  reconcilePreview,
  casPreview,
  rowStates,
  setRowStates,
  fnoRowStates,
  setFnoRowStates,
}: ImportStep2ReviewProps) {
  if (!reconcilePreview && !casPreview) return null;

  const unresolvedRows = getUnresolvedRows(reconcilePreview, rowStates);
  const unresolvedScrips = Array.from(new Set(unresolvedRows.map((e) => e.symbol)));

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
    <div className="space-y-2">
      {reconcilePreview && (
        <>
          <ReconciliationSummaryStats
            reconcilePreview={reconcilePreview}
            unresolvedRows={unresolvedRows}
            unresolvedScrips={unresolvedScrips}
            onSkipUnmappedRows={handleSkipUnmappedRows}
          />

          <div className="space-y-2 pr-1">
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
    </div>
  );
}
