import { describe, expect, it } from 'vitest';

import { fundBuy, job, stockBuy, trade } from './tradebook.fixtures';
import {
  allCharges,
  chargesTotal,
  chargeTextsOf,
  EMPTY_CHARGES,
  exactRupees,
  filledCharges,
  fyOptions,
  isTradebookFiltered,
  jobLine,
  jobTime,
  parseTradebookUrl,
  priceText,
  quantityText,
  subLineText,
  tradebookQuery,
  tradebookRow,
  tradebookUrl,
  tradeLabel,
  tradeTotals,
  validateTrade,
} from './tradebookModel';

describe('tradebook URL state', () => {
  it('defaults to the first page of 25, every broker, both sides, every year', () => {
    expect(parseTradebookUrl({})).toEqual({ q: '', broker: '', type: '', fy: null, page: 0, size: 25 });
  });

  it('reads every filter and ignores junk', () => {
    expect(parseTradebookUrl({ q: ' tcs ', broker: 'b1', type: 'sell', fy: '2026', page: '2', size: '50' })).toEqual({
      q: 'tcs',
      broker: 'b1',
      type: 'sell',
      fy: 2026,
      page: 2,
      size: 50,
    });
    expect(parseTradebookUrl({ type: 'hold', fy: 'abc', page: '-3', size: '7' })).toEqual({ q: '', broker: '', type: '', fy: null, page: 0, size: 25 });
  });

  it('keeps defaults out of the URL and round-trips the rest', () => {
    expect(tradebookUrl(parseTradebookUrl({}))).toBe('/ds/investments/tradebook');
    const state = parseTradebookUrl({ q: 'tcs', broker: 'b1', type: 'buy', fy: '2025', page: '1', size: '100' });
    expect(tradebookUrl(state)).toBe('/ds/investments/tradebook?q=tcs&broker=b1&type=buy&fy=2025&page=1&size=100');
    expect(parseTradebookUrl(Object.fromEntries(new URL(tradebookUrl(state), 'http://x').searchParams))).toEqual(state);
  });

  it('asks the server for the newest trades first with every filter', () => {
    expect(tradebookQuery(parseTradebookUrl({ q: 'tcs', broker: 'b1', type: 'sell', fy: '2026', page: '1' }))).toEqual({
      search: 'tcs',
      brokerAccountId: 'b1',
      type: 'sell',
      fy: 2026,
      sort: 'tradeDate,desc',
      page: 1,
      size: 25,
    });
    expect(tradebookQuery(parseTradebookUrl({}))).toMatchObject({ search: undefined, brokerAccountId: undefined, type: undefined, fy: undefined });
  });

  it('knows when a filter is on', () => {
    expect(isTradebookFiltered(parseTradebookUrl({}))).toBe(false);
    expect(isTradebookFiltered(parseTradebookUrl({ page: '3', size: '50' }))).toBe(false);
    for (const p of [{ q: 'a' }, { broker: 'b' }, { type: 'buy' }, { fy: '2026' }]) expect(isTradebookFiltered(parseTradebookUrl(p))).toBe(true);
  });
});

describe('fyOptions', () => {
  it('lists every year, then the current FY and seven before it', () => {
    const options = fyOptions('2026-10-13', null);
    expect(options[0]).toEqual({ value: '', label: 'All years' });
    expect(options[1]).toEqual({ value: '2026', label: 'FY 26-27' });
    expect(options).toHaveLength(9);
    expect(options.at(-1)).toEqual({ value: '2019', label: 'FY 19-20' });
  });

  it('counts January to March in the FY that began the year before', () => {
    expect(fyOptions('2027-02-01', null)[1].value).toBe('2026');
  });

  it('keeps an older selected year in the list', () => {
    expect(fyOptions('2026-10-13', 2012).at(-1)).toEqual({ value: '2012', label: 'FY 12-13' });
  });
});

describe('tradebookRow', () => {
  it('draws a stock sell with its realised gain and settlement', () => {
    const row = tradebookRow(trade());
    expect(row).toMatchObject({
      date: '1 Oct 26',
      title: 'TATAMOTORS',
      broker: 'Zerodha',
      side: 'Sell',
      settlement: 'Delivery',
      quantity: '50',
      pricePlain: '710.00',
      valuePlain: '35,500',
      value: '₹35,500',
      chargesPlain: '42.10',
    });
    expect(subLineText(row)).toBe('1 Oct · 50 @ ₹710 · realised −₹13,500 · delivery');
    expect(row.sub.realised?.tone).toBe('danger');
  });

  it('draws a fund buy in units with no settlement and zero charges', () => {
    const row = tradebookRow(fundBuy);
    expect(row).toMatchObject({ title: 'Parag Parikh Flexi Cap', side: 'Buy', settlement: '—', chargesPlain: '0', valuePlain: '5,000' });
    expect(subLineText(row)).toBe('5 Oct · 55.98 units @ ₹89.32');
  });

  it('shows a buy without a realised figure, and a gain in the positive tone', () => {
    expect(subLineText(tradebookRow(stockBuy))).toBe('21 May · 200 @ ₹62 · delivery');
    const gain = tradebookRow(trade({ realisedPnl: 2425 }));
    expect(gain.sub.realised).toEqual({ text: 'realised +₹2,425', tone: 'positive' });
  });

  it('reads an intraday trade', () => {
    expect(tradebookRow(trade({ settlementType: 'intraday' })).settlement).toBe('Intraday');
  });

  it('falls back to the name when there is no symbol, and names a trade for the delete prompt', () => {
    expect(tradeLabel(trade())).toBe('TATAMOTORS · 1 Oct 26 sell');
    expect(tradeLabel(fundBuy)).toBe('Parag Parikh Flexi Cap · 5 Oct 26 buy');
  });
});

describe('the jobs line', () => {
  it('formats the time in the app zone, 24-hour', () => {
    expect(jobTime('2026-10-13T05:32:10Z')).toBe('13 Oct, 11:02');
    expect(jobTime('nope')).toBe('');
  });

  it('says when the last import ran and how many trades it wrote', () => {
    expect(jobLine('Last import', job(), true)).toEqual({ text: 'Last import 13 Oct, 11:02 · 14 trades', jobId: 'job-1' });
    expect(jobLine('Last import', job({ result: { committed: 1, skipped: 0, failed: [], skippedItems: [] } }), true)?.text).toMatch(/· 1 trade$/);
  });

  it('shows no count for a reconcile, a failed or an unfinished job', () => {
    expect(jobLine('Last reconcile', job({ id: 'job-2', type: 'BROKER_RECONCILE_COMMIT' }), false)).toEqual({ text: 'Last reconcile 13 Oct, 11:02', jobId: 'job-2' });
    expect(jobLine('Last import', job({ status: 'FAILED', result: null }), true)?.text).toBe('Last import 13 Oct, 11:02');
    expect(jobLine('Last import', job({ status: 'RUNNING', finishedAt: null, result: null }), true)?.text).toBe('Last import 13 Oct, 11:01');
  });

  it('draws nothing without a job', () => {
    expect(jobLine('Last import', null, true)).toBeNull();
  });
});

describe('the trade form figures', () => {
  const charges = { ...EMPTY_CHARGES, stt: '35.50', exchangeTxnCharges: '6.6' };

  it('sums the itemised charges', () => {
    expect(chargesTotal(charges)).toBeCloseTo(42.1);
    expect(chargesTotal(EMPTY_CHARGES)).toBe(0);
  });

  it('adds the charges to a buy and takes them off a sell, never below zero', () => {
    expect(tradeTotals('buy', '20', '1512.70', charges)).toMatchObject({ value: 30254, charges: 42.1, total: 30296.1 });
    expect(tradeTotals('sell', '50', '710', charges).total).toBeCloseTo(35457.9);
    expect(tradeTotals('sell', '1', '10', { ...EMPTY_CHARGES, stt: '50' }).total).toBe(0);
  });

  it('treats empty or broken text as zero', () => {
    expect(tradeTotals('buy', '', 'abc', EMPTY_CHARGES)).toEqual({ value: 0, charges: 0, total: 0 });
  });

  it('writes figures with paise only when there are some', () => {
    expect(exactRupees(30254)).toBe('₹30,254');
    expect(exactRupees(35457.9)).toBe('₹35,457.90');
    expect(exactRupees(0)).toBe('₹0');
  });

  it('refuses no quantity, a negative price and no date', () => {
    expect(validateTrade({ quantity: '', price: '', date: '' })).toEqual({
      quantity: 'Quantity must be above zero',
      price: 'Enter the price per unit',
      date: 'Trade date is required',
    });
    expect(validateTrade({ quantity: '0', price: '-1', date: '2026-10-13' })).toEqual({ quantity: 'Quantity must be above zero', price: 'Enter the price per unit' });
    expect(validateTrade({ quantity: '0.5', price: '0', date: '2026-10-13' })).toEqual({});
  });

  it('sends a new trade every charge, empty ones as zero', () => {
    expect(allCharges(charges)).toEqual({
      brokerage: 0,
      stt: 35.5,
      exchangeTxnCharges: 6.6,
      sebiCharges: 0,
      stampDuty: 0,
      gst: 0,
      dpCharges: 0,
      otherCharges: 0,
    });
  });

  it('sends an edited trade only the charges that have a figure', () => {
    expect(filledCharges(charges)).toEqual({ stt: 35.5, exchangeTxnCharges: 6.6 });
    expect(filledCharges({ ...EMPTY_CHARGES, gst: '0' })).toEqual({ gst: 0 });
  });

  it('fills an edit from the stored trade', () => {
    expect(chargeTextsOf(trade())).toEqual({
      brokerage: '0.00',
      stt: '35.50',
      exchangeTxnCharges: '1.06',
      sebiCharges: '0.04',
      stampDuty: '0.00',
      gst: '0.20',
      dpCharges: '5.30',
      otherCharges: '0.00',
    });
    expect(chargeTextsOf(trade({ stt: undefined, brokerage: null as unknown as undefined })).stt).toBe('');
    expect(quantityText('55.9800')).toBe('55.98');
    expect(quantityText('50')).toBe('50');
    expect(priceText('710')).toBe('710.00');
    expect(priceText('89.3214')).toBe('89.3214');
  });
});
