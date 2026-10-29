'use client';

import React from 'react';

import { Banner, GRID_GAP,KpiTile } from '@/components/ds';

import { skipRows, unmappedMessage } from './importModel';
import { CasTable, ExecutionsTable, FnoTable } from './ReviewTables';
import { getCasUnresolvedRows, getUnresolvedRows } from './types';
import type { useImportWizard } from './useImportWizard';

type Wizard = ReturnType<typeof useImportWizard>;

function Tiles({ tiles }: { tiles: [string, React.ReactNode][] }) {
  return (
    <div className={`grid grid-cols-2 ${GRID_GAP} desk:grid-cols-4`}>
      {tiles.map(([label, value]) => (
        <KpiTile key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function UnmappedBanner({ message, names, onSkip, disabled }: { message: string; names: string[]; onSkip: () => void; disabled: boolean }) {
  return (
    <Banner tone="danger" title={message} action={disabled ? undefined : { label: 'Skip unmapped rows', onSelect: onSkip }}>
      {names.length > 0 ? <p>{`Unmapped scrips: ${names.join(', ')}`}</p> : null}
    </Banner>
  );
}

/** Step 2: the counters, what needs you, and the rows with an include box each. */
export function ReviewStep({ wizard }: { wizard: Wizard }) {
  const { mode, rowStates, setRowStates, fnoRowStates, setFnoRowStates, isCommitting } = wizard;
  // The preview of the import type that is chosen; a stale one from the other type is never drawn.
  const reconcilePreview = mode === 'mf_cas' ? null : wizard.reconcilePreview;
  const casPreview = mode === 'mf_cas' ? wizard.casPreview : null;
  const [showWarnings, setShowWarnings] = React.useState(true);

  if (reconcilePreview) {
    const stats = reconcilePreview.summaryStats;
    const unresolved = getUnresolvedRows(reconcilePreview, rowStates);
    const scrips = Array.from(new Set(unresolved.map((e) => e.symbol)));
    const warnings = reconcilePreview.warnings;
    const fnoTrades = reconcilePreview.fnoTrades ?? [];
    return (
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Tiles
          tiles={[
            ['Executions', stats.totalExecutions],
            ['CNC / MIS', `${stats.deliveryExecutions} / ${stats.intradayExecutions}`],
            ['Warns / gaps', stats.warningsCount],
            ['Duplicates', stats.duplicates],
          ]}
        />
        {unresolved.length > 0 ? (
          <UnmappedBanner
            message={unmappedMessage(unresolved.length, 'execution')}
            names={scrips}
            disabled={isCommitting}
            onSkip={() =>
              setRowStates((prev) =>
                skipRows(
                  prev,
                  unresolved.map((r) => r.rowIndex),
                ),
              )
            }
          />
        ) : null}
        {warnings.length > 0 ? (
          <Banner
            tone="warning"
            title={`Reconciliation alerts & flags (${warnings.length})`}
            action={{ label: showWarnings ? 'Hide' : 'Show', onSelect: () => setShowWarnings((v) => !v) }}
          >
            {showWarnings
              ? warnings.map((w, i) => (
                  <p key={i}>
                    <strong>{`[${w.type}]:`}</strong> {w.message}
                  </p>
                ))
              : null}
          </Banner>
        ) : null}
        {reconcilePreview.executions.length > 0 ? (
          <ExecutionsTable
            executions={reconcilePreview.executions}
            rowStates={rowStates}
            setRowStates={setRowStates}
            locked={isCommitting}
          />
        ) : null}
        {fnoTrades.length > 0 ? (
          <FnoTable trades={fnoTrades} fnoRowStates={fnoRowStates} setFnoRowStates={setFnoRowStates} locked={isCommitting} />
        ) : null}
      </div>
    );
  }

  if (casPreview) {
    const summary = casPreview.summary;
    const unresolved = getCasUnresolvedRows(casPreview, rowStates);
    const names = Array.from(new Set(unresolved.map((r) => r.parsedRow.parsedName || r.parsedRow.parsedSymbol || 'Unnamed row')));
    return (
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Tiles
          tiles={[
            ['Rows', summary.total],
            ['Matched', summary.matched],
            ['Unmatched', summary.unmatched],
            ['Duplicates', summary.duplicates],
          ]}
        />
        {summary.note ? <Banner tone="neutral">{summary.note}</Banner> : null}
        {summary.errors > 0 ? (
          <Banner tone="warning">{`${summary.errors} row${summary.errors > 1 ? 's' : ''} could not be read and will NOT be imported.`}</Banner>
        ) : null}
        {unresolved.length > 0 ? (
          <UnmappedBanner
            message={unmappedMessage(unresolved.length, 'row')}
            names={names}
            disabled={isCommitting}
            onSkip={() =>
              setRowStates((prev) =>
                skipRows(
                  prev,
                  unresolved.map((r) => r.rowIndex),
                ),
              )
            }
          />
        ) : null}
        <CasTable rows={casPreview.rows} rowStates={rowStates} setRowStates={setRowStates} locked={isCommitting} />
      </div>
    );
  }

  return null;
}
