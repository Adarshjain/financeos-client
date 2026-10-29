import { describe, expect, it, vi } from 'vitest';

import { summary, trades } from './fno.fixtures';
import {
  contractName,
  figuresModel,
  FNO_HREF,
  fnoListRow,
  fnoQuery,
  fnoUrl,
  fyOptions,
  monthRows,
  parseFnoUrl,
  realisedLine,
  sourceLabel,
  tradeSpan,
  underlyingRows,
} from './fnoModel';

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

describe('F&O URL state', () => {
  it('defaults to the current financial year, newest first, 25 a page', () => {
    expect(parseFnoUrl({})).toEqual({ q: '', contract: '', broker: '', fy: 2026, sort: 'newest', page: 0, size: 25 });
  });

  it('reads every filter and ignores values it does not know', () => {
    expect(parseFnoUrl({ contract: 'OPT' }).contract).toBe('OPT');
    expect(parseFnoUrl({ q: ' nifty ', contract: 'PE', broker: 'b2', fy: '2025', sort: 'pnl_desc', page: '3', size: '50' })).toEqual({
      q: 'nifty',
      contract: 'PE',
      broker: 'b2',
      fy: 2025,
      sort: 'pnl_desc',
      page: 2,
      size: 50,
    });
    expect(parseFnoUrl({ contract: 'XYZ', fy: 'x', sort: 'big', page: '-3', size: '7' })).toMatchObject({
      contract: '',
      fy: 2026,
      sort: 'newest',
      page: 0,
      size: 25,
    });
  });

  it('keeps defaults out of the address and puts the rest in', () => {
    expect(fnoUrl(parseFnoUrl({}))).toBe(FNO_HREF);
    expect(fnoUrl(parseFnoUrl({ q: 'NIFTY', contract: 'CE', broker: 'b1', fy: '2025', sort: 'oldest', page: '2', size: '100' }))).toBe(
      `${FNO_HREF}?q=NIFTY&contract=CE&broker=b1&fy=2025&sort=oldest&page=2&size=100`,
    );
  });

  it('asks the server for the year, the contract, the broker, the underlying, the sort and the page', () => {
    expect(fnoQuery(parseFnoUrl({ q: 'NIFTY', contract: 'FUT', broker: 'b1', sort: 'pnl_asc', page: '2' }))).toEqual({
      fy: 2026,
      optionType: 'FUT',
      brokerAccountId: 'b1',
      search: 'NIFTY',
      sort: 'pnl_asc',
      page: 1,
      size: 25,
    });
    expect(fnoQuery(parseFnoUrl({}))).toMatchObject({ optionType: undefined, brokerAccountId: undefined, search: undefined });
  });

  it('offers the last six financial years, and an older selected one', () => {
    expect(fyOptions(2026).map((o) => o.label)).toEqual(['FY 26-27', 'FY 25-26', 'FY 24-25', 'FY 23-24', 'FY 22-23', 'FY 21-22']);
    expect(fyOptions(2018).at(-1)).toEqual({ value: '2018', label: 'FY 18-19' });
  });
});

describe('F&O figures', () => {
  it('reads realised P&L, win rate and charges from the summary', () => {
    expect(figuresModel(summary)).toEqual({
      realised: { text: '+₹10,456', tone: 'positive' },
      winRate: '50%',
      winSub: '2 of 4',
      charges: '₹669',
    });
  });

  it('shows a loss in the danger tone and a single trade in its win count', () => {
    const model = figuresModel({ ...summary, realisedPnl: -300, tradeCount: 1, winRate: 0, winCount: 0, totalCharges: 40 });
    expect(model.realised).toEqual({ text: '−₹300', tone: 'danger' });
    expect(model.winSub).toBe('0 of 1');
  });

  it('says the realised line under the list', () => {
    expect(realisedLine(summary)).toBe('Realised +₹10,456 · taxed as business income');
  });

  it('lists only the months with a result, with bars sized against the biggest', () => {
    const rows = monthRows(summary);
    expect(rows.map((r) => [r.label, r.amount, r.pct])).toEqual([
      ['September', '+₹6,266', 100],
      ['October', '+₹4,190', 67],
    ]);
    expect(rows.every((r) => r.barTone === 'positive')).toBe(true);
  });

  it('draws a losing month with a danger bar', () => {
    const rows = monthRows({ ...summary, byMonth: [{ month: '2026-06', pnl: -500 }] });
    expect(rows[0]).toMatchObject({ label: 'June', amount: '−₹500', tone: 'danger', barTone: 'danger', pct: 100 });
  });

  it('lists the underlyings with signed amounts in the server order', () => {
    expect(underlyingRows(summary).map((r) => [r.label, r.amount, r.tone])).toEqual([
      ['NIFTY', '+₹16,366', 'positive'],
      ['BANKNIFTY', '−₹4,571', 'danger'],
      ['RELIANCE', '−₹1,339', 'danger'],
    ]);
  });
});

describe('F&O rows', () => {
  it('names an option by underlying, strike and type, and a future by its expiry month', () => {
    expect(contractName(trades[0])).toBe('RELIANCE 3000 CE');
    expect(contractName(trades[2])).toBe('NIFTY OCT FUT');
    expect(contractName({ ...trades[2], expiryDate: undefined })).toBe('NIFTY FUT');
    expect(contractName({ ...trades[0], underlyingSymbol: undefined })).toBe('RELIANCE26OCT3000CE 3000 CE');
  });

  it('builds the table cells of an option', () => {
    expect(fnoListRow(trades[0])).toMatchObject({
      contract: 'RELIANCE 3000 CE',
      expiry: '29 Oct',
      type: 'Option · CE',
      typeTone: 'info',
      strike: '3,000',
      qty: '500',
      bought: '14,500',
      sold: '13,250',
      charges: '88.90',
      pnlPlain: '−1,339',
      pnl: '−₹1,339',
      pnlTone: 'danger',
      source: 'Statement',
    });
  });

  it('builds a future without a strike, with a manual source and Indian grouping', () => {
    expect(fnoListRow(trades[2])).toMatchObject({
      type: 'Future',
      typeTone: 'neutral',
      strike: null,
      bought: '18,91,500',
      sold: '19,02,750',
      pnlPlain: '+10,837',
      pnlTone: 'positive',
      source: 'Manual',
    });
  });

  it('writes the phone line with the span, quantity, values and source', () => {
    expect(fnoListRow(trades[0]).line).toBe('7 → 10 Oct · 500 qty · bought ₹14,500 · sold ₹13,250 · statement');
    expect(fnoListRow(trades[2]).line).toBe('13 → 18 Sep · 75 qty · bought ₹18,91,500 · sold ₹19,02,750 · manual');
  });

  it('writes the span across months, with one date and with none', () => {
    expect(tradeSpan('2026-09-30', '2026-10-03')).toBe('30 Sep → 3 Oct');
    expect(tradeSpan(undefined, '2026-10-10')).toBe('10 Oct');
    expect(tradeSpan('2026-10-07', undefined)).toBe('7 Oct');
    expect(tradeSpan(undefined, undefined)).toBe('');
  });

  it('reads an imported trade as a statement and anything else as manual', () => {
    expect(sourceLabel('import')).toBe('Statement');
    expect(sourceLabel('manual')).toBe('Manual');
    expect(sourceLabel(undefined)).toBe('Manual');
  });
});
