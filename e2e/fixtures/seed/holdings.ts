import type { ApiClient } from '../api';
import { istToday } from '../dates';
import { createBrokerAccount } from './accounts';
import {
  createCorporateAction,
  createDividend,
  createInstrument,
  generateIsin,
  setManualPrice,
  trade,
  uniqueSeedSuffix,
} from './investments';

export interface SeededHoldings {
  zerodha: { id: string; name: string };
  groww: { id: string; name: string };
  /** Held at two brokers, with a bonus, a dividend and two manual prices. */
  infy: { id: string; symbol: string; name: string };
  /** Priced by hand below its cost. */
  tcs: { id: string; symbol: string; name: string };
  /** An open holding with no price at all. */
  noPrice: { id: string; symbol: string; name: string };
  /** Fully merged into `target`. */
  merged: { id: string; symbol: string; name: string };
  target: { id: string; symbol: string; name: string };
}

async function stock(api: ApiClient, label: string) {
  const suffix = uniqueSeedSuffix();
  const symbol = `${label}${suffix}`;
  const name = `${label} Test Ltd ${suffix}`;
  const res = await createInstrument(api, { type: 'stock', name, symbol, isin: generateIsin(), exchange: 'NSE' });
  return { id: res.id, symbol, name };
}

/** Five stocks across two brokers: every row state of the Holdings tab (priced by hand, at cost, merged) and the holding page's sections. */
export async function seedHoldings(api: ApiClient): Promise<SeededHoldings> {
  const zerodha = await createBrokerAccount(api, { name: 'Zerodha Main', provider: 'Zerodha' });
  const groww = await createBrokerAccount(api, { name: 'Groww Demat', provider: 'Groww' });
  const today = istToday();

  const infy = await stock(api, 'INFYX');
  await trade(api, { brokerAccountId: zerodha.id, instrumentId: infy.id, type: 'buy', quantity: 20, price: 1420, tradeDate: '2024-03-11' });
  await trade(api, { brokerAccountId: groww.id, instrumentId: infy.id, type: 'buy', quantity: 10, price: 1420, tradeDate: '2024-04-02' });
  await setManualPrice(api, infy.id, { price: 1466.2, asOf: istToday(-3) });
  await setManualPrice(api, infy.id, { price: 1512.7, asOf: today });
  await createDividend(api, {
    brokerAccountId: zerodha.id,
    instrumentId: infy.id,
    type: 'dividend',
    amount: 440,
    perUnit: 22,
    tds: 44,
    exDate: '2025-05-30',
    payDate: '2025-06-18',
  });
  // A real 1:1 bonus (1 → 2) dated before the first buy, so it shows on the page without changing the quantities.
  await createCorporateAction(api, infy.id, { type: 'bonus', ratioFrom: 1, ratioTo: 2, exDate: '2024-01-10' });

  const tcs = await stock(api, 'TCSX');
  await trade(api, { brokerAccountId: zerodha.id, instrumentId: tcs.id, type: 'buy', quantity: 10, price: 3620, tradeDate: '2024-06-03' });
  await setManualPrice(api, tcs.id, { price: 3480.15, asOf: today });

  const noPrice = await stock(api, 'SINTEXX');
  await trade(api, { brokerAccountId: groww.id, instrumentId: noPrice.id, type: 'buy', quantity: 100, price: 45, tradeDate: '2024-07-01' });

  const target = await stock(api, 'HDFCBANKX');
  await trade(api, { brokerAccountId: zerodha.id, instrumentId: target.id, type: 'buy', quantity: 40, price: 1580, tradeDate: '2024-02-01' });
  await setManualPrice(api, target.id, { price: 1742.6, asOf: today });

  const merged = await stock(api, 'HDFCX');
  await trade(api, { brokerAccountId: zerodha.id, instrumentId: merged.id, type: 'buy', quantity: 10, price: 1500, tradeDate: '2023-01-02' });
  await createCorporateAction(api, merged.id, {
    type: 'merger',
    ratioFrom: 1,
    ratioTo: 1,
    exDate: '2023-07-13',
    targetInstrumentId: target.id,
    costAllocationPct: 100,
  });

  return {
    zerodha: { id: zerodha.id, name: 'Zerodha Main' },
    groww: { id: groww.id, name: 'Groww Demat' },
    infy,
    tcs,
    noPrice,
    merged,
    target,
  };
}
