import { CreateInstrumentRequest, ReconciledExecution } from '@/lib/types';

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
