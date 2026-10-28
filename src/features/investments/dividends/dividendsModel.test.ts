import { describe, expect, it } from 'vitest';

import { pinClock } from '@/test/pinClock';

import { awaiting, dividend, instrumentTotal, receipts, suggestion, summary, unrecordedCredit } from './dividends.fixtures';
import {
  byInstrumentRow,
  dividendFilters,
  dividendListRow,
  dividendsFigures,
  dividendsTiles,
  dividendsUrl,
  effectiveFy,
  figureFilters,
  fyOptions,
  fyStartOf,
  fyTotals,
  listTotals,
  notReceivedCounts,
  notReceivedNote,
  parseDividendsUrl,
  perUnitText,
  receiptNoteOf,
  receiptVariance,
  receiptWord,
  suggestionRow,
  tdsHint,
  toDecimal,
  totalsLine,
  unitsOf,
  unrecordedBanner,
} from './dividendsModel';

pinClock();

const DEFAULTS = parseDividendsUrl({});
const UUID = '5f0bb705-96f2-4c7e-89d8-88cece3fd79b';

describe('the address', () => {
  it('reads nothing as the current FY, 25 rows, every broker, type and receipt', () => {
    expect(DEFAULTS).toEqual({ fy: null, broker: '', type: '', receipt: '', instrument: '', page: 0, size: 25, ipage: 0 });
  });

  it('reads and writes every filter, keeping defaults out of the address', () => {
    const state = parseDividendsUrl({ fy: '2025', broker: 'b1', type: 'interest', receipt: 'overdue', instrumentId: UUID, page: '2', size: '50', ip: '1' });
    expect(state).toEqual({ fy: 2025, broker: 'b1', type: 'interest', receipt: 'overdue', instrument: UUID, page: 2, size: 50, ipage: 1 });
    expect(dividendsUrl(state)).toBe(`/investments/dividends?fy=2025&broker=b1&type=interest&receipt=overdue&instrumentId=${UUID}&page=2&size=50&ip=1`);
    expect(dividendsUrl(DEFAULTS)).toBe('/investments/dividends');
  });

  it('reads all FYs as "all" and ignores values it does not know', () => {
    expect(parseDividendsUrl({ fy: 'all' }).fy).toBe('all');
    expect(dividendsUrl({ ...DEFAULTS, fy: 'all' })).toContain('fy=all');
    const bad = parseDividendsUrl({ fy: '26', type: 'bonus', receipt: 'paid', size: '7', page: '-3', ip: 'x', instrumentId: 'not-an-id' });
    expect(bad).toEqual(DEFAULTS);
  });
});

describe('the financial year', () => {
  it('starts in April', () => {
    expect(fyStartOf('2026-04-01')).toBe(2026);
    expect(fyStartOf('2026-03-31')).toBe(2025);
    expect(fyStartOf('2026-10-23')).toBe(2026);
  });

  it('defaults to the current FY, and "all" means no FY at all', () => {
    expect(effectiveFy(DEFAULTS, '2026-10-23')).toBe(2026);
    expect(effectiveFy({ ...DEFAULTS, fy: 2024 }, '2026-10-23')).toBe(2024);
    expect(effectiveFy({ ...DEFAULTS, fy: 'all' }, '2026-10-23')).toBeUndefined();
  });

  it('sends the list every filter and the figures every filter but the receipt', () => {
    const state = { ...DEFAULTS, broker: 'b1', type: 'dividend' as const, receipt: 'awaiting' as const, instrument: 'i1' };
    expect(dividendFilters(state, 2026)).toEqual({ brokerAccountId: 'b1', type: 'dividend', instrumentId: 'i1', fy: 2026, receipt: 'awaiting' });
    expect(figureFilters(state, undefined)).toEqual({ brokerAccountId: 'b1', type: 'dividend', instrumentId: 'i1', fy: undefined, receipt: undefined });
  });

  it('offers All FYs, then each FY with payouts and the one shown, newest first', () => {
    const options = fyOptions(summary(), 2024, 2026);
    expect(options.map((o) => o.label)).toEqual(['All FYs', 'FY 26-27', 'FY 25-26', 'FY 24-25']);
    expect(options.map((o) => o.value)).toEqual(['all', '2026', '2025', '2024']);
    expect(fyOptions(null, undefined, 2026).map((o) => o.label)).toEqual(['All FYs', 'FY 26-27']);
  });

  it('reads a FY of the summary, or its totals for all FYs, or zeros', () => {
    expect(fyTotals(summary(), 2026)).toEqual({ gross: 3975, tds: 370, net: 3605, count: 5 });
    expect(fyTotals(summary(), undefined)).toEqual({ gross: 5175, tds: 490, net: 4685, count: 7 });
    expect(fyTotals(summary(), 2020)).toEqual({ gross: 0, tds: 0, net: 0, count: 0 });
    expect(fyTotals(null, 2026)).toBeNull();
  });
});

describe('the figures', () => {
  const totals = { gross: 3975, tds: 370, net: 3605, count: 5 };

  it('declares the FY, counts what matched bank credits and adds up what is not received', () => {
    const f = dividendsFigures(2026, totals, receipts(), { overdue: ['ITC'], awaiting: ['TCS'] });
    expect(f.fy).toBe('FY 26-27');
    expect(f.declared).toEqual({ value: '₹3,975', context: '5 payouts' });
    expect(f.received).toEqual({ value: '₹1,980', context: '2 matched to bank credits' });
    expect(f.tds).toEqual({ value: '₹370', context: 'claim in ITR' });
    expect(f.notReceived).toEqual({ value: '₹1,460', context: 'ITC overdue · TCS awaiting', tone: 'warning' });
  });

  it('counts untracked receipts into Received and says so', () => {
    const f = dividendsFigures(
      2026,
      totals,
      receipts({
        buckets: [
          { status: 'received', count: 1, expectedNet: 500, receivedAmount: 500 },
          { status: 'received_untracked', count: 2, expectedNet: 300, receivedAmount: 300 },
        ],
      }),
      {},
    );
    expect(f.received).toEqual({ value: '₹800', context: '1 matched to a bank credit · incl. 2 untracked' });
    expect(f.notReceived).toEqual({ value: '₹0', context: undefined, tone: undefined });
  });

  it('includes payouts marked not received, and falls back to counts without names', () => {
    const r = receipts({ buckets: [{ status: 'not_received', count: 3, expectedNet: 900, receivedAmount: 0 }] });
    const f = dividendsFigures(undefined, totals, r, {});
    expect(f.fy).toBeNull();
    expect(f.notReceived).toEqual({ value: '₹900', context: '3 not received', tone: 'warning' });
  });

  it('shows a dash, not zero, for a figure that could not be read', () => {
    const f = dividendsFigures(2026, null, null, {});
    expect([f.declared.value, f.received.value, f.tds.value, f.notReceived.value]).toEqual(['—', '—', '—', '—']);
    expect(dividendsTiles(f)[1].tone).toBeUndefined();
    expect(dividendsFigures(2026, totals, null, {}).declared.value).toBe('₹3,975');
  });

  it('has no list total without a summary', () => {
    expect(listTotals(DEFAULTS, null, receipts(), [], 0)).toBeNull();
  });

  it('names two instruments and counts the rest', () => {
    const counts = notReceivedCounts(receipts({ buckets: [{ status: 'overdue', count: 4, expectedNet: 10, receivedAmount: 0 }] }));
    expect(notReceivedNote(counts, { overdue: ['ITC', 'INFY', 'TCS'] })).toBe('ITC, INFY +2 overdue');
  });

  it('draws four tiles, the first reading FY only when a FY is shown', () => {
    const tiles = dividendsTiles(dividendsFigures(2026, totals, receipts(), {}));
    expect(tiles.map((t) => t.label)).toEqual(['Declared · FY', 'Received', 'TDS', 'Not received']);
    expect(dividendsTiles(dividendsFigures(undefined, totals, receipts(), {}))[0].label).toBe('Declared');
  });
});

describe('a row of the list', () => {
  it('draws the figures plain and the phone line from the parts it has', () => {
    const row = dividendListRow(dividend());
    expect(row).toMatchObject({
      title: 'HDFCBANK',
      payDate: '11 Jul',
      payDay: '11 Jul',
      perUnit: '22.00',
      gross: '880',
      tds: '88',
      net: '792',
      unitsLine: '₹22 × 40',
      tdsLine: 'TDS ₹88',
      account: 'HDFC Savings',
      canLink: false,
      noBankNote: null,
    });
    expect(row.receipt).toEqual({ label: 'Received', tone: 'success' });
  });

  it('offers to link an awaiting payout and has no TDS line without TDS', () => {
    const row = dividendListRow(awaiting());
    expect(row).toMatchObject({ canLink: true, tdsLine: null, account: null, unitsLine: '₹11 × 10', net: '110' });
    expect(row.receipt).toEqual({ label: 'Awaiting', tone: 'neutral' });
  });

  it('says when no statement covers the pay date, and falls back to the name and a dash', () => {
    const row = dividendListRow(awaiting({ symbol: undefined, perUnit: undefined, receiptStatus: 'unverifiable', payDate: '2026-08-28' }));
    expect(row.title).toBe('Tata Consultancy Services');
    expect(row.noBankNote).toBe('no statement covers 28 Aug');
    expect(row.perUnit).toBe('—');
    expect(row.unitsLine).toBeNull();
    expect(row.canLink).toBe(false);
  });

  it('puts overdue and not received in amber', () => {
    expect(receiptWord('overdue')?.tone).toBe('warning');
    expect(receiptWord('not_received')?.tone).toBe('warning');
    expect(receiptWord('received_untracked')).toEqual({ label: 'Received (untracked)', tone: 'success' });
    expect(receiptWord(undefined)).toBeNull();
  });

  it('formats figures and units', () => {
    expect(perUnitText(5.5)).toBe('₹5.50');
    expect(perUnitText(11)).toBe('₹11');
    expect(perUnitText(7.5025)).toBe('₹7.5025');
    expect(unitsOf(1500, 7.5)).toBe(200);
    expect(unitsOf(100, null)).toBeNull();
    expect(unitsOf(0, 5)).toBeNull();
  });
});

describe('the footer total', () => {
  const totals = { gross: 3975, tds: 370, net: 3605, count: 5 };

  it('is the FY total without a receipt filter', () => {
    expect(listTotals(DEFAULTS, totals, receipts(), [], 5)).toEqual({ net: '₹3,605', tds: '₹370' });
    expect(totalsLine({ net: '₹3,605', tds: '₹370' })).toBe('Total net ₹3,605 · TDS ₹370');
  });

  it('adds up the one page of a receipt-filtered list', () => {
    const rows = [dividend(), awaiting()];
    expect(listTotals({ ...DEFAULTS, receipt: 'awaiting' }, totals, receipts(), rows, 2)).toEqual({ net: '₹902', tds: '₹88' });
  });

  it('reads the receipt bucket for a long filtered list, without TDS', () => {
    const t = listTotals({ ...DEFAULTS, receipt: 'overdue' }, totals, receipts(), [dividend()], 30);
    expect(t).toEqual({ net: '₹1,350', tds: null });
    expect(totalsLine(t!)).toBe('Total net ₹1,350');
    expect(listTotals({ ...DEFAULTS, receipt: 'not_received' }, totals, receipts(), [dividend()], 30)).toBeNull();
  });
});

describe('receipts and credits', () => {
  it('measures the gap between the credit and the expected net, ignoring rounding', () => {
    expect(receiptVariance(dividend())).toBeNull();
    expect(receiptVariance(dividend({ tds: 0 }))).toBe(-88);
    expect(receiptVariance(awaiting())).toBeNull();
  });

  it('offers a TDS hint only for a shortfall that looks like withholding', () => {
    expect(tdsHint(900, 1000, '')).toBe(100);
    expect(tdsHint(900, 1000, '100')).toBeNull();
    expect(tdsHint(500, 1000, '')).toBeNull();
    expect(tdsHint(1000, 1000, '')).toBeNull();
    expect(tdsHint(null, 1000, '')).toBeNull();
  });

  it('maps the receipt note both ways', () => {
    expect(receiptNoteOf('not_received')).toBe('not_received');
    expect(receiptNoteOf('received_untracked')).toBe('received_untracked');
    expect(receiptNoteOf('received')).toBe('derived');
    expect(receiptNoteOf(undefined)).toBe('derived');
  });

  it('words the banner over one credit, two credits and more', () => {
    expect(unrecordedBanner([])).toBeNull();
    expect(unrecordedBanner([unrecordedCredit()])).toEqual({
      title: '1 bank credit looks like a dividend but is not recorded:',
      detail: '"ACH CR · COAL INDIA LTD" ₹1,020 on 24 Sep.',
    });
    const two = unrecordedBanner([unrecordedCredit(), unrecordedCredit({ id: 'tx2', amount: 415, date: '2026-09-19', description: 'NACH CR · NTPC DIV' })]);
    expect(two).toEqual({
      title: '2 bank credits look like dividends but are not recorded:',
      detail: '"ACH CR · COAL INDIA LTD" ₹1,020 on 24 Sep and "NACH CR · NTPC DIV" ₹415 on 19 Sep.',
    });
    const three = unrecordedBanner([unrecordedCredit(), unrecordedCredit({ id: 'b' }), unrecordedCredit({ id: 'c' })]);
    expect(three?.detail.endsWith('and 1 more.')).toBe(true);
  });
});

describe('the cards', () => {
  it('shows an instrument by symbol, then by name, with its net', () => {
    expect(byInstrumentRow(instrumentTotal())).toEqual({ id: 'i3', title: 'ITC', net: '₹4,250' });
    expect(byInstrumentRow(instrumentTotal({ symbol: null })).title).toBe('ITC Ltd');
  });

  it('words a suggestion, with the year only when it is not this year', () => {
    expect(suggestionRow(suggestion())).toEqual({ key: 'h2-2026-08-05', title: 'TCS · ₹10 / share', line: 'paid 5 Aug · 10 shares · ₹100' });
    expect(suggestionRow(suggestion({ exDate: '2025-10-28', perUnit: 21, qtyHeld: 60, estimatedAmount: 1260 })).line).toBe('paid 28 Oct 2025 · 60 shares · ₹1,260');
    expect(suggestionRow(suggestion({ qtyHeld: 1 })).line).toContain('1 share ·');
  });

  it('rounds typed numbers to the places asked and drops what is not a number', () => {
    expect(toDecimal('1020.499999', 2)).toBe(1020.5);
    expect(toDecimal('7.50256', 4)).toBe(7.5026);
    expect(toDecimal('', 2)).toBeUndefined();
    expect(toDecimal('abc', 2)).toBeUndefined();
  });
});
