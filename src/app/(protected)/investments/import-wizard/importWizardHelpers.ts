import {
  CommitFnoTradeDto,
  ImportCommitRequest,
  ImportPreview,
  ReconcileCommitRequest,
  ReconcilePreview,
  ReconciliationBroker,
} from '@/lib/types';

import { RowState } from './types';

// Pure payload-building helpers extracted from useImportWizard.ts to keep that hook
// under the file-size convention — no React state here, just row-state -> request-body
// mapping shared by the preview-init and commit-submit steps.

export function buildInitialReconcileRowStates(
  executions: ReconcilePreview['executions']
): Record<number, RowState> {
  const initialStates: Record<number, RowState> = {};
  for (const exec of executions) {
    initialStates[exec.rowIndex] = {
      skip: exec.isDuplicate,
      selectedInstrumentId: exec.matchedInstrument?.id,
      createNew: false,
      newInstrument: {
        type: 'stock',
        name: exec.symbol || 'New Instrument',
        symbol: exec.symbol || '',
        exchange: exec.exchange || 'NSE',
        isin: exec.isin || undefined,
        yahooSymbol: undefined,
      },
    };
  }
  return initialStates;
}

export function buildInitialFnoRowStates(
  fnoTrades: ReconcilePreview['fnoTrades']
): Record<number, { skip: boolean }> {
  const initialFnoStates: Record<number, { skip: boolean }> = {};
  (fnoTrades || []).forEach((trade, idx) => {
    initialFnoStates[idx] = { skip: trade.isDuplicate };
  });
  return initialFnoStates;
}

export function buildInitialCasRowStates(
  rows: ImportPreview['rows']
): Record<number, RowState> {
  const initialStates: Record<number, RowState> = {};
  for (const row of rows) {
    initialStates[row.rowIndex] = {
      skip: row.duplicate || !!row.parsedRow?.error,
      selectedInstrumentId: row.matchedInstrument?.id,
      createNew: false,
      newInstrument: {
        type: 'mutual_fund',
        name:
          row.parsedRow.parsedName ||
          row.parsedRow.parsedSymbol ||
          'New Mutual Fund',
        symbol: row.parsedRow.parsedSymbol || '',
        exchange: 'MUTUAL_FUND',
        isin: row.parsedRow.parsedIsin || undefined,
      },
    };
  }
  return initialStates;
}

export function buildReconcileCommitRequest(params: {
  broker: ReconciliationBroker;
  brokerAccountId: string;
  reconcilePreview: ReconcilePreview;
  rowStates: Record<number, RowState>;
  fnoRowStates: Record<number, { skip: boolean }>;
}): ReconcileCommitRequest {
  const { broker, brokerAccountId, reconcilePreview, rowStates, fnoRowStates } =
    params;

  const executions = reconcilePreview.executions.map((exec) => {
    const state = rowStates[exec.rowIndex] || { skip: false };
    return {
      rowIndex: exec.rowIndex,
      tradeDate: exec.tradeDate,
      type: exec.type,
      settlementType: exec.settlementType,
      symbol: exec.symbol,
      isin: exec.isin,
      exchange: exec.exchange,
      quantity: exec.quantity,
      price: exec.price,
      charges: exec.charges,
      externalRef: exec.externalRef,
      instrumentId: !state.createNew
        ? state.selectedInstrumentId || exec.matchedInstrument?.id
        : undefined,
      newInstrument: state.createNew ? state.newInstrument : undefined,
      skip: state.skip,
    };
  });

  const fnoTrades: CommitFnoTradeDto[] = (reconcilePreview.fnoTrades || []).map(
    (trade, idx) => {
      const state = fnoRowStates[idx] || { skip: trade.isDuplicate };
      return {
        tradingSymbol: trade.tradingSymbol,
        underlyingSymbol: trade.underlyingSymbol,
        contractType: trade.contractType,
        optionType: trade.optionType,
        strikePrice: trade.strikePrice,
        expiryDate: trade.expiryDate,
        quantity: trade.quantity,
        buyValue: trade.buyValue,
        sellValue: trade.sellValue,
        totalCharges: trade.totalCharges,
        entryDate: trade.entryDate,
        exitDate: trade.exitDate,
        externalRef: trade.externalRef,
        skip: state.skip,
      };
    }
  );

  return {
    broker,
    brokerAccountId,
    executions,
    classifications: reconcilePreview.classifications,
    fnoTrades,
  };
}

export function buildCasCommitRequest(params: {
  brokerAccountId: string;
  casPreview: ImportPreview;
  rowStates: Record<number, RowState>;
}): ImportCommitRequest {
  const { brokerAccountId, casPreview, rowStates } = params;
  const rows = casPreview.rows.map((row) => {
    const state = rowStates[row.rowIndex] || { skip: false };
    return {
      rowIndex: row.rowIndex,
      row: row.parsedRow,
      skip: state.skip,
      instrumentId: !state.createNew
        ? state.selectedInstrumentId || row.matchedInstrument?.id
        : undefined,
      newInstrument: state.createNew ? state.newInstrument : undefined,
    };
  });
  return { source: 'mf_cas', brokerAccountId, rows };
}
