import type { SelectOption } from '@/components/ds';
import { type Broker, isAccountClosed } from '@/lib/account.types';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';
import type { FnoTradePreview, ImportRow, ReconciledExecution } from '@/lib/types';

import { moveTone } from '../investmentsFormat';
import type { ImportAssetScope, ImportMode, RowState } from './types';

export const IMPORT_STEPS = [
  { id: 'upload', label: 'Upload files' },
  { id: 'review', label: 'Review' },
  { id: 'result', label: 'Result' },
];

export const MODE_OPTIONS: SelectOption[] = [
  { value: 'reconcile_zerodha', label: 'Zerodha reconciliation (Tradebook + Tax P&L)' },
  { value: 'reconcile_groww', label: 'Groww reconciliation (Order History + Capital Gains)' },
  { value: 'mf_cas', label: 'Mutual funds CAS (CAMS / KFintech PDF)' },
  { value: 'epf_passbook', label: 'EPF passbook (EPFO PDF)' },
];

export const SCOPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Stocks & F&O (both)' },
  { value: 'equity', label: 'Stocks only' },
  { value: 'fno', label: 'F&O only' },
];

/** The target account choices: open broker accounts, plus the one already chosen even if it has closed. */
export function brokerOptions(brokers: Broker[], selectedId: string): SelectOption[] {
  return brokers
    .filter((b) => !isAccountClosed(b) || b.id === selectedId)
    .map((b) => ({ value: b.id, label: `${b.name} (${b.provider || 'Broker'})${b.closedOn ? ' (Closed)' : ''}` }));
}

/** Zerodha with F&O only: the Tax P&L alone, no tradebook and no holdings snapshot. */
export function isFnoOnly(mode: ImportMode, scope: ImportAssetScope): boolean {
  return mode === 'reconcile_zerodha' && scope === 'fno';
}

/** The words and accepted formats of the reconcile upload sections, per broker. */
export function reconcileCopy(mode: ImportMode) {
  const zerodha = mode === 'reconcile_zerodha';
  return {
    taxTitle: `1. ${zerodha ? 'Zerodha Tax P&L' : 'Groww Capital Gains'} (XLSX)`,
    taxZone: `Upload ${zerodha ? 'Tax P&L' : 'Capital Gains'} XLSX file(s)`,
    tradebookTitle: `2. ${zerodha ? 'Zerodha Tradebook' : 'Groww Order History'}`,
    tradebookZone: `Upload ${zerodha ? 'Tradebook CSV' : 'Order History XLSX'} file(s)`,
    tradebookAccept: zerodha ? '.csv' : '.xlsx,.xls,.csv',
  };
}

export const TAX_ACCEPT = '.xlsx,.xls';
export const HOLDINGS_ACCEPT = '.csv,.xlsx,.xls';
export const CAS_ACCEPT = '.pdf,.csv';

/** The step 1 note above the files. */
export function reconcileNote(fnoOnly: boolean): { lead: string; body: string } {
  return fnoOnly
    ? {
        lead: 'F&O realized P&L:',
        body: 'Read directly from the Tax P&L — buy value, sell value and charges per contract. No tradebook needed.',
      }
    : {
        lead: 'Authoritative intraday & clean FIFO:',
        body: 'Tax P&L provides intraday classification and realized exit charges. Executions are classified, matched via delivery-only FIFO, and cost basis is computed using traded price.',
      };
}

/** "₹49,000.00": two decimals, Indian grouping. */
export function money(value: number | string | null | undefined): string {
  return formatMoney(Number(value ?? 0), { decimals: 'exact' });
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatQuantity(bytes / 1024, 1)} KB`;
  return `${formatQuantity(bytes / (1024 * 1024), 1)} MB`;
}

/** A selected file as DropZone lists it. */
export function queuedFile(file: File, index: number) {
  return { id: `${index}-${file.name}`, name: file.name, size: fileSize(file.size) };
}

// ---- Review rows ----------------------------------------------------------------

export interface ExecutionRow {
  /** The preview's row index, as text. */
  id: string;
  rowIndex: number;
  date: string;
  side: 'Buy' | 'Sell';
  settlement: 'CNC' | 'MIS';
  symbol: string;
  /** "INE002A01018 • NSE" */
  scrip: string;
  /** "20 × ₹2,450.00" */
  qtyPrice: string;
  total: string;
  exec: ReconciledExecution;
}

/** Rows that need you (no instrument, or a duplicate) first, then by trade date. */
export function sortExecutions(executions: ReconciledExecution[]): ReconciledExecution[] {
  return [...executions].sort((a, b) => {
    const aAttention = !a.matchedInstrument || a.isDuplicate;
    const bAttention = !b.matchedInstrument || b.isDuplicate;
    if (aAttention !== bAttention) return aAttention ? -1 : 1;
    return a.tradeDate.localeCompare(b.tradeDate);
  });
}

export function executionRow(exec: ReconciledExecution): ExecutionRow {
  return {
    id: String(exec.rowIndex),
    rowIndex: exec.rowIndex,
    date: formatDate(exec.tradeDate, 'list'),
    side: exec.type === 'buy' ? 'Buy' : 'Sell',
    settlement: exec.settlementType === 'intraday' ? 'MIS' : 'CNC',
    symbol: exec.symbol,
    scrip: [exec.isin, exec.exchange].filter(Boolean).join(' • '),
    qtyPrice: `${exec.quantity} × ${money(exec.price)}`,
    total: money(exec.totalValue),
    exec,
  };
}

export interface FnoRow {
  /** The trade's position in the preview, as text. */
  id: string;
  index: number;
  symbol: string;
  kind: string;
  duplicate: boolean;
  /** "Underlying: NIFTY | CE @ 24500 | Exp: 28 Aug 26" */
  detail: string;
  quantity: string;
  buy: string;
  sell: string;
  charges: string;
  pnl: string;
  pnlTone: 'positive' | 'danger' | undefined;
  /** The phone's line: "Qty 75 · Buy ₹11,250.00 · Sell ₹29,625.00" */
  figures: string;
}

export function fnoRow(t: FnoTradePreview, index: number): FnoRow {
  const detail = [
    t.underlyingSymbol && `Underlying: ${t.underlyingSymbol}`,
    t.optionType && `${t.optionType}${t.strikePrice ? ` @ ${t.strikePrice}` : ''}`,
    t.expiryDate && `Exp: ${formatDate(t.expiryDate, 'list')}`,
  ]
    .filter(Boolean)
    .join(' | ');
  return {
    id: String(index),
    index,
    symbol: t.tradingSymbol,
    kind: t.contractType === 'option' ? 'OPT' : 'FUT',
    duplicate: t.isDuplicate,
    detail,
    quantity: formatQuantity(t.quantity),
    buy: money(t.buyValue),
    sell: money(t.sellValue),
    charges: money(t.totalCharges),
    pnl: formatMoney(t.realizedPnl, { decimals: 'exact', sign: 'always' }),
    pnlTone: moveTone(t.realizedPnl),
    figures: `Qty ${formatQuantity(t.quantity)} · Buy ${money(t.buyValue)} · Sell ${money(t.sellValue)}`,
  };
}

/** The realized P&L of the F&O trades that are still included. */
export function netRealized(trades: FnoTradePreview[], fnoRowStates: Record<number, { skip: boolean }>): number {
  return trades.reduce((sum, t, idx) => (fnoRowStates[idx]?.skip ? sum : sum + (t.realizedPnl || 0)), 0);
}

/** The F&O row's include state: the user's choice, else skipped when it is a duplicate. */
export function fnoSkipped(t: FnoTradePreview, idx: number, fnoRowStates: Record<number, { skip: boolean }>): boolean {
  return (fnoRowStates[idx] ?? { skip: t.isDuplicate }).skip;
}

export interface CasRow {
  id: string;
  rowIndex: number;
  date: string;
  side: 'Buy' | 'Sell' | 'Dividend';
  name: string;
  /** The ISIN, or the symbol when the file has no ISIN. */
  scrip: string;
  /** "40.5 × ₹123.46", or just the amount when the row has no units. */
  unitsNav: string;
  amount: string;
  error?: string;
  row: ImportRow;
}

export function casRow(row: ImportRow): CasRow {
  const p = row.parsedRow;
  const units = p.quantity != null && p.quantity !== '' ? Number(p.quantity) : null;
  const nav = p.price != null && p.price !== '' ? Number(p.price) : null;
  const amount =
    p.amount != null && p.amount !== '' ? Number(p.amount) : units != null && nav != null ? units * nav : null;
  return {
    id: String(row.rowIndex),
    rowIndex: row.rowIndex,
    date: p.tradeDate ? formatDate(p.tradeDate, 'list') : '',
    side: p.kind === 'dividend' ? 'Dividend' : p.type === 'sell' ? 'Sell' : 'Buy',
    name: p.parsedName || p.parsedSymbol || p.parsedIsin || 'Unnamed row',
    scrip: p.parsedIsin || p.parsedSymbol || '',
    unitsNav: units != null && nav != null ? `${formatQuantity(units)} × ${money(nav)}` : '',
    amount: amount != null ? money(amount) : '',
    error: p.error || undefined,
    row,
  };
}

/** Rows that need you (an error, no instrument or a duplicate) first, then by the file's order. */
export function sortCasRows(rows: ImportRow[]): ImportRow[] {
  const attention = (r: ImportRow) => !!r.parsedRow.error || !r.matchedInstrument || r.duplicate;
  return [...rows].sort((a, b) => {
    if (attention(a) !== attention(b)) return attention(a) ? -1 : 1;
    return a.rowIndex - b.rowIndex;
  });
}

// ---- Selection ------------------------------------------------------------------

/** Applies a new selection to row states: each listed row is included, every other one skipped. `locked` rows never change. */
export function applySelection(
  rowStates: Record<number, RowState>,
  allRowIds: number[],
  selected: string[],
  locked: ReadonlySet<number> = new Set(),
): Record<number, RowState> {
  const chosen = new Set(selected);
  const next = { ...rowStates };
  for (const idx of allRowIds) {
    if (locked.has(idx)) continue;
    next[idx] = { ...(next[idx] ?? {}), skip: !chosen.has(String(idx)) } as RowState;
  }
  return next;
}

/** "2 executions have no instrument mapped and will NOT be imported. Map each below, or exclude them." */
export function unmappedMessage(count: number, noun: string): string {
  return `${count} ${noun}${count > 1 ? 's have' : ' has'} no instrument mapped and will NOT be imported. Map each below, or exclude them.`;
}

// ---- Row edits (pure; the review step feeds them to `setRowStates`) -------------------

type RowStates = Record<number, RowState>;

/** Maps a row to an instrument the user picked. */
export function mapInstrument(prev: RowStates, rowIndex: number, inst: { id: string; name: string }): RowStates {
  return {
    ...prev,
    [rowIndex]: { ...prev[rowIndex], selectedInstrumentId: inst.id, selectedInstrumentName: inst.name, createNew: false },
  };
}

/** Creates the instrument from the row (true) or undoes that (false); creating clears a mapping. */
export function setCreateNew(prev: RowStates, rowIndex: number, createNew: boolean): RowStates {
  return {
    ...prev,
    [rowIndex]: {
      ...prev[rowIndex],
      createNew,
      ...(createNew ? { selectedInstrumentId: undefined, selectedInstrumentName: undefined } : {}),
    },
  };
}

/** Excludes the rows (the "Skip unmapped rows" button). */
export function skipRows(prev: RowStates, rowIndexes: number[]): RowStates {
  const next = { ...prev };
  for (const idx of rowIndexes) next[idx] = { ...(next[idx] || {}), skip: true } as RowState;
  return next;
}

/** The include toggle of one F&O trade. */
export function setFnoSkip(prev: Record<number, { skip: boolean }>, index: number, skip: boolean) {
  return { ...prev, [index]: { skip } };
}
