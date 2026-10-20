import { CreateInstrumentRequest, ImportPreview, ReconciledExecution, ReconcilePreview } from '@/lib/types';

export type ImportMode = 'reconcile_zerodha' | 'reconcile_groww' | 'mf_cas';
export type ImportAssetScope = 'all' | 'equity' | 'fno';

export interface RowState {
  skip: boolean;
  selectedInstrumentId?: string;
  selectedInstrumentName?: string;
  createNew?: boolean;
  newInstrument?: CreateInstrumentRequest;
}

export const isRowResolved = (state: RowState | undefined, exec: ReconciledExecution) =>
  !!(
    state?.selectedInstrumentId ||
    (state?.createNew && state?.newInstrument) ||
    (!state?.createNew && exec.matchedInstrument)
  );

// Shared between ImportStep2Review (summary stats) and ImportWizardDialog
// (footer label/disabled state) — the footer lives outside the step component.
export const getUnresolvedRows = (
  reconcilePreview: ReconcilePreview | null,
  rowStates: Record<number, RowState>,
) =>
  reconcilePreview
    ? reconcilePreview.executions.filter((e) => {
        const s = rowStates[e.rowIndex];
        return !s?.skip && !isRowResolved(s, e);
      })
    : [];

export const getConfirmableCount = (
  reconcilePreview: ReconcilePreview | null,
  rowStates: Record<number, RowState>,
  fnoRowStates: Record<number, { skip: boolean }>,
) =>
  reconcilePreview
    ? reconcilePreview.executions.filter((e) => {
        const s = rowStates[e.rowIndex] || {};
        return !s.skip && isRowResolved(s, e);
      }).length +
      (reconcilePreview.fnoTrades || []).filter((_, idx) => !fnoRowStates[idx]?.skip).length
    : 0;

export const getCasConfirmableCount = (
  casPreview: ImportPreview | null,
  rowStates: Record<number, RowState>,
) =>
  casPreview
    ? casPreview.rows.filter((r) => {
        const s = rowStates[r.rowIndex] || {};
        return !s.skip && (s.selectedInstrumentId || r.matchedInstrument);
      }).length
    : 0;
