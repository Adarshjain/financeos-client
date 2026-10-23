import type { ApiClient } from '../api';
import { createBrokerAccount } from './accounts';
import { createCorporateAction, createInstrument, generateIsin, trade, uniqueSeedSuffix } from './investments';

type Ref = { id: string; symbol: string; name: string };

export interface SeededCorporateActions {
  /** A bonus 1:2 (30 → 60) with a note. */
  infy: Ref;
  /** A split 1:3 and a demerger 10:1 into `hotels`. */
  itc: Ref;
  hotels: Ref;
}

async function stock(api: ApiClient, label: string): Promise<Ref> {
  const suffix = uniqueSeedSuffix();
  const symbol = `${label}${suffix}`;
  const name = `${label} Test Ltd ${suffix}`;
  const res = await createInstrument(api, { type: 'stock', name, symbol, isin: generateIsin(), exchange: 'NSE' });
  return { id: res.id, symbol, name };
}

/** Three recorded actions over two held stocks: a bonus with a note, a split and a demerger. */
export async function seedCorporateActions(api: ApiClient): Promise<SeededCorporateActions> {
  const zerodha = await createBrokerAccount(api, { name: 'Zerodha Main', provider: 'Zerodha' });

  const infy = await stock(api, 'INFYX');
  await trade(api, { brokerAccountId: zerodha.id, instrumentId: infy.id, type: 'buy', quantity: 30, price: 1420, tradeDate: '2024-03-11' });
  await createCorporateAction(api, infy.id, { type: 'bonus', ratioFrom: 1, ratioTo: 2, exDate: '2025-06-10', notes: 'record date 11 Jun 25' });

  const itc = await stock(api, 'ITCX');
  const hotels = await stock(api, 'ITCHOTELSX');
  await trade(api, { brokerAccountId: zerodha.id, instrumentId: itc.id, type: 'buy', quantity: 100, price: 410, tradeDate: '2024-02-01' });
  await createCorporateAction(api, itc.id, { type: 'split', ratioFrom: 1, ratioTo: 3, exDate: '2025-02-20' });
  await createCorporateAction(api, itc.id, {
    type: 'demerger',
    ratioFrom: 10,
    ratioTo: 1,
    exDate: '2025-04-01',
    targetInstrumentId: hotels.id,
    costAllocationPct: 1.5,
  });

  return { infy, itc, hotels };
}
