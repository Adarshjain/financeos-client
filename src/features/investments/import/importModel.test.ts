import { describe, expect, it } from 'vitest';

import { pinClock } from '@/test/pinClock';

import { broker, casPreview, execution, fnoTrade, reconcilePreview } from './import.fixtures';
import {
  applySelection,
  brokerOptions,
  casRow,
  executionRow,
  fnoRow,
  fnoSkipped,
  isFnoOnly,
  mapInstrument,
  money,
  netRealized,
  reconcileCopy,
  reconcileNote,
  setCreateNew,
  setFnoSkip,
  skipRows,
  sortCasRows,
  sortExecutions,
  unmappedMessage,
} from './importModel';
import { buildInitialCasRowStates, buildInitialFnoRowStates, buildInitialReconcileRowStates } from './importWizardHelpers';
import { getCasConfirmableCount, getCasUnresolvedRows, getConfirmableCount, getUnresolvedRows } from './types';

pinClock();

describe('import model: choices and copy', () => {
  it('lists open broker accounts, and a closed one only while it is chosen', () => {
    const open = broker();
    const closed = broker({ id: 'b2', name: 'Old broker', provider: undefined, closedOn: '2025-01-01' } as never);
    expect(brokerOptions([open, closed], '').map((o) => o.label)).toEqual(['Zerodha main (Zerodha)']);
    expect(brokerOptions([open, closed], 'b2').map((o) => o.label)).toEqual(['Zerodha main (Zerodha)', 'Old broker (Broker) (Closed)']);
  });

  it('is F&O only for Zerodha with that scope, and for nothing else', () => {
    expect(isFnoOnly('reconcile_zerodha', 'fno')).toBe(true);
    expect(isFnoOnly('reconcile_zerodha', 'all')).toBe(false);
    expect(isFnoOnly('reconcile_groww', 'fno')).toBe(false);
    expect(isFnoOnly('mf_cas', 'fno')).toBe(false);
  });

  it('names the sections and accepted formats per broker', () => {
    expect(reconcileCopy('reconcile_zerodha')).toMatchObject({ taxTitle: '1. Zerodha Tax P&L (XLSX)', tradebookTitle: '2. Zerodha Tradebook', tradebookAccept: '.csv' });
    expect(reconcileCopy('reconcile_groww')).toMatchObject({ taxTitle: '1. Groww Capital Gains (XLSX)', tradebookTitle: '2. Groww Order History', tradebookAccept: '.xlsx,.xls,.csv' });
    expect(reconcileNote(true).lead).toBe('F&O realized P&L:');
    expect(reconcileNote(false).lead).toBe('Authoritative intraday & clean FIFO:');
  });

  it('formats money with two decimals', () => {
    expect(money(49000)).toBe('₹49,000.00');
    expect(money('214.6')).toBe('₹214.60');
  });

  it('words the unmapped count', () => {
    expect(unmappedMessage(1, 'execution')).toBe('1 execution has no instrument mapped and will NOT be imported. Map each below, or exclude them.');
    expect(unmappedMessage(2, 'row')).toContain('2 rows have no instrument mapped');
  });
});

describe('import model: executions', () => {
  it('puts rows that need you first (unmatched, duplicate), then by date', () => {
    const sorted = sortExecutions(reconcilePreview().executions).map((e) => e.symbol);
    expect(sorted).toEqual(['RELIANCE', 'IDEAFORGE', 'TATATECH', 'ZOMATO']);
  });

  it('builds the row words and figures', () => {
    const row = executionRow(execution());
    expect(row).toMatchObject({ id: '1', date: '11 Mar', side: 'Buy', settlement: 'CNC', symbol: 'ZOMATO', scrip: 'INE758T01015 • NSE', qtyPrice: '100 × ₹214.60', total: '₹21,460.00' });
    expect(executionRow(execution({ type: 'sell', settlementType: 'intraday', isin: undefined })).scrip).toBe('NSE');
    expect(executionRow(execution({ type: 'sell', settlementType: 'intraday' }))).toMatchObject({ side: 'Sell', settlement: 'MIS' });
  });

  it('starts duplicates skipped and everything else included', () => {
    const states = buildInitialReconcileRowStates(reconcilePreview().executions);
    expect(Object.fromEntries(Object.entries(states).map(([k, v]) => [k, v.skip]))).toEqual({ 1: false, 2: false, 3: false, 4: true });
  });
});

describe('import model: F&O trades', () => {
  it('builds a contract row with its detail and signed P&L', () => {
    const row = fnoRow(fnoTrade(), 0);
    expect(row).toMatchObject({
      id: '0',
      symbol: 'NIFTY2682824500CE',
      kind: 'OPT',
      detail: 'Underlying: NIFTY | CE @ 24500 | Exp: 28 Aug',
      quantity: '75',
      buy: '₹11,250.00',
      sell: '₹29,625.00',
      charges: '₹142.60',
      pnl: '+₹18,232.40',
      pnlTone: 'positive',
      figures: 'Qty 75 · Buy ₹11,250.00 · Sell ₹29,625.00',
    });
    expect(fnoRow(fnoTrade({ contractType: 'future', optionType: undefined, strikePrice: undefined, realizedPnl: -1840 }), 1)).toMatchObject({ kind: 'FUT', detail: 'Underlying: NIFTY | Exp: 28 Aug', pnlTone: 'danger' });
  });

  it('adds up the realized P&L of the included trades only', () => {
    const trades = reconcilePreview().fnoTrades!;
    const states = buildInitialFnoRowStates(trades);
    expect(states).toEqual({ 0: { skip: false }, 1: { skip: true } });
    expect(netRealized(trades, states)).toBeCloseTo(18232.4);
    expect(netRealized(trades, setFnoSkip(states, 1, false))).toBeCloseTo(15412.4);
    expect(netRealized(trades, setFnoSkip(states, 0, true))).toBe(0);
  });

  it('reads a trade without a choice as skipped when it is a duplicate', () => {
    const [a, b] = reconcilePreview().fnoTrades!;
    expect(fnoSkipped(a, 0, {})).toBe(false);
    expect(fnoSkipped(b, 1, {})).toBe(true);
    expect(fnoSkipped(b, 1, { 1: { skip: false } })).toBe(false);
  });
});

describe('import model: statement rows', () => {
  it('builds a row from the parsed statement line', () => {
    const row = casRow(casPreview().rows[0]);
    expect(row).toMatchObject({ id: '1', date: '1 Aug', side: 'Buy', name: 'E2E Bluechip Growth Fund', scrip: 'INF100E2E001', unitsNav: '40.5 × ₹123.46', amount: '₹5,000.00' });
  });

  it('shows a dividend, a sale and an unreadable row', () => {
    const rows = casPreview().rows;
    const div = casRow({ ...rows[0], parsedRow: { ...rows[0].parsedRow, kind: 'dividend', quantity: undefined, price: undefined } });
    expect(div).toMatchObject({ side: 'Dividend', unitsNav: '', amount: '₹5,000.00' });
    expect(casRow({ ...rows[0], parsedRow: { ...rows[0].parsedRow, type: 'sell' } }).side).toBe('Sell');
    expect(casRow(rows[3]).error).toBe('Could not read the units');
  });

  it('puts unreadable, unmatched and duplicate rows first', () => {
    const order = sortCasRows(casPreview().rows).map((r) => r.rowIndex);
    expect(order).toEqual([2, 3, 4, 1]);
  });

  it('starts duplicates and unreadable rows excluded', () => {
    const states = buildInitialCasRowStates(casPreview().rows);
    expect(Object.fromEntries(Object.entries(states).map(([k, v]) => [k, v.skip]))).toEqual({ 1: false, 2: false, 3: true, 4: true });
  });

  it('counts included rows with an instrument, and the included ones without', () => {
    const preview = casPreview();
    const states = buildInitialCasRowStates(preview.rows);
    expect(getCasConfirmableCount(preview, states)).toBe(1);
    expect(getCasUnresolvedRows(preview, states).map((r) => r.rowIndex)).toEqual([2]);
    expect(getCasConfirmableCount(preview, mapInstrument(states, 2, { id: 'f2', name: 'Midcap' }))).toBe(2);
    expect(getCasUnresolvedRows(preview, mapInstrument(states, 2, { id: 'f2', name: 'Midcap' }))).toEqual([]);
    expect(getCasUnresolvedRows(preview, skipRows(states, [2]))).toEqual([]);
    expect(getCasUnresolvedRows(preview, setCreateNew(states, 2, true))).toEqual([]);
    expect(getCasUnresolvedRows(null, {})).toEqual([]);
  });
});

describe('import model: selection and edits', () => {
  it('applies a selection: listed rows are included, the others skipped, locked rows stay', () => {
    const states = { 1: { skip: false }, 2: { skip: false }, 3: { skip: true } };
    const next = applySelection(states, [1, 2, 3], ['2', '3'], new Set([3]));
    expect(next[1].skip).toBe(true);
    expect(next[2].skip).toBe(false);
    expect(next[3].skip).toBe(true);
    expect(states[1].skip).toBe(false);
  });

  it('keeps a mapping when the include box changes', () => {
    const mapped = mapInstrument({}, 5, { id: 'i1', name: 'Zomato Ltd' });
    expect(applySelection(mapped, [5], [])[5]).toMatchObject({ skip: true, selectedInstrumentId: 'i1' });
  });

  it('maps, creates and undoes', () => {
    const mapped = mapInstrument({ 1: { skip: false } }, 1, { id: 'i1', name: 'Zomato Ltd' });
    expect(mapped[1]).toMatchObject({ selectedInstrumentId: 'i1', selectedInstrumentName: 'Zomato Ltd', createNew: false });
    const created = setCreateNew(mapped, 1, true);
    expect(created[1]).toMatchObject({ createNew: true, selectedInstrumentId: undefined, selectedInstrumentName: undefined });
    expect(setCreateNew(created, 1, false)[1].createNew).toBe(false);
  });

  it('skips the unmapped rows and counts what is left', () => {
    const preview = reconcilePreview();
    const states = buildInitialReconcileRowStates(preview.executions);
    const fno = buildInitialFnoRowStates(preview.fnoTrades);
    const unresolved = getUnresolvedRows(preview, states);
    expect(unresolved.map((r) => r.symbol)).toEqual(['IDEAFORGE', 'TATATECH']);
    expect(getConfirmableCount(preview, states, fno)).toBe(1 + 1);
    const skipped = skipRows(states, unresolved.map((r) => r.rowIndex));
    expect(getUnresolvedRows(preview, skipped)).toEqual([]);
    expect(getConfirmableCount(preview, skipped, fno)).toBe(1 + 1);
    // Mapping one row makes it count.
    expect(getConfirmableCount(preview, mapInstrument(states, 2, { id: 'i', name: 'X' }), fno)).toBe(2 + 1);
    expect(getConfirmableCount(preview, setCreateNew(states, 3, true), fno)).toBe(2 + 1);
  });
});
