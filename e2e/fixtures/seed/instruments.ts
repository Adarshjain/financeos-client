import type { ApiClient } from '../api';
import { istToday } from '../dates';
import { createBrokerAccount } from './accounts';
import { createInstrument, generateIsin, setManualPrice, trade, uniqueSeedSuffix } from './investments';

export interface SeededInstruments {
  /** A unique word in every seeded name: search it to see only these instruments. */
  tag: string;
  /** A held stock priced by hand today. */
  held: { id: string; name: string; symbol: string };
  /** A stock nobody holds, priced by hand ten days ago (stale). */
  stale: { id: string; name: string; symbol: string };
  /** A fund with an AMFI code and a manual price today. */
  fund: { id: string; name: string; amfiCode: string };
  /** A stock the user has edited for their account (it shows the edited note). */
  edited: { id: string; name: string; originalName: string };
  /** An ETF with no price. */
  noPrice: { id: string; name: string };
}

/** Five instruments around one tag: every row state of the Instruments tab (held, not held, stale, fund, edited, no price). */
export async function seedInstruments(api: ApiClient): Promise<SeededInstruments> {
  const tag = `ZQX${uniqueSeedSuffix()}`;
  const today = istToday();

  const held = { name: `${tag} Held Ltd`, symbol: `${tag}H` };
  const heldRes = await createInstrument(api, { type: 'stock', ...held, isin: generateIsin(), exchange: 'NSE', yahooSymbol: `${tag}H.NS` });
  await setManualPrice(api, heldRes.id, { price: 1512.7, asOf: today });
  const broker = await createBrokerAccount(api, { name: `Broker ${tag}`, provider: 'Zerodha' });
  await trade(api, { brokerAccountId: broker.id, instrumentId: heldRes.id, type: 'buy', quantity: 10, price: 1400, tradeDate: '2024-03-11' });

  const stale = { name: `${tag} Stale Ltd`, symbol: `${tag}S` };
  const staleRes = await createInstrument(api, { type: 'stock', ...stale, isin: generateIsin(), exchange: 'NSE', yahooSymbol: `${tag}S.NS` });
  await setManualPrice(api, staleRes.id, { price: 690.05, asOf: istToday(-10) });

  const amfiCode = `9${uniqueSeedSuffix()}`.slice(0, 6);
  const fundName = `${tag} Flexi Cap Fund`;
  const fundRes = await createInstrument(api, { type: 'mutual_fund', name: fundName, amfiCode, currency: 'INR' });
  await setManualPrice(api, fundRes.id, { price: 92.31, asOf: today });

  const originalName = `${tag} Edited Original`;
  const editedRes = await createInstrument(api, { type: 'stock', name: originalName, symbol: `${tag}E`, isin: generateIsin(), exchange: 'NSE', yahooSymbol: `${tag}E.NS` });
  await setManualPrice(api, editedRes.id, { price: 300, asOf: today });
  const editedName = `${tag} Edited Name`;
  const put = await api.PUT('/api/v1/instruments/{id}', {
    params: { path: { id: editedRes.id } },
    body: { type: 'stock', name: editedName, symbol: `${tag}E`, isin: editedRes.isin ?? undefined, exchange: 'NSE', yahooSymbol: `${tag}E.NS`, currency: 'INR' },
  });
  if (put.error) throw new Error(`edit instrument failed (${put.response.status}): ${JSON.stringify(put.error)}`);

  const noPriceRes = await createInstrument(api, { type: 'etf', name: `${tag} Gold ETF`, symbol: `${tag}G`, isin: generateIsin('INF'), exchange: 'NSE', yahooSymbol: `${tag}G.NS` });

  return {
    tag,
    held: { id: heldRes.id, ...held },
    stale: { id: staleRes.id, ...stale },
    fund: { id: fundRes.id, name: fundName, amfiCode },
    edited: { id: editedRes.id, name: editedName, originalName },
    noPrice: { id: noPriceRes.id, name: `${tag} Gold ETF` },
  };
}

/** `count` plain stocks named `<prefix> 01`…, to fill more than one page. */
export async function seedManyInstruments(api: ApiClient, prefix: string, count: number): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      createInstrument(api, { type: 'stock', name: `${prefix} ${String(i + 1).padStart(2, '0')}`, symbol: `${prefix}${i + 1}`, isin: generateIsin(), exchange: 'NSE' }),
    ),
  );
}
