import { type ApiClient, expectStatus, waitForJob } from '../api';
import { createBrokerAccount } from './accounts';
import { createInstrument, generateIsin, trade, uniqueSeedSuffix } from './investments';

export interface SeededTradebook {
  zerodha: { id: string; name: string };
  groww: { id: string; name: string };
  /** The stock every trade is in. */
  stock: { id: string; symbol: string; name: string };
  /** A fund bought at Groww on 2026-10-05: 50 units at 100 (one trade). */
  fund: { id: string; name: string };
  /** The sell, booked at Zerodha with a realised gain. */
  sellId: string;
  /** Trades in all: `bulk` buys, the fund buy and the sell. */
  total: number;
}

/** Day `n` (1-based) of a date run that stays inside FY 24-25 (April 2024 on). */
function day(n: number): string {
  const d = new Date(Date.UTC(2024, 3, 1 + n));
  return d.toISOString().slice(0, 10);
}

/**
 * `bulk` small buys of one stock across two brokers (so the list has more than a page), plus a fund buy in
 * October 2026 (FY 26-27) and one sell at a gain.
 */
export async function seedTradebook(api: ApiClient, bulk = 26): Promise<SeededTradebook> {
  const zerodha = await createBrokerAccount(api, { name: 'Zerodha Main', provider: 'Zerodha' });
  const groww = await createBrokerAccount(api, { name: 'Groww Demat', provider: 'Groww' });
  const suffix = uniqueSeedSuffix();
  const symbol = `TBKX${suffix}`;
  const name = `Tradebook Test Ltd ${suffix}`;
  const stockRes = await createInstrument(api, { type: 'stock', name, symbol, isin: generateIsin(), exchange: 'NSE' });
  const fundRes = await createInstrument(api, { type: 'mutual_fund', name: `Tradebook Flexi Fund ${suffix}`, amfiCode: `9${suffix}`.slice(0, 6), currency: 'INR' });

  for (let i = 1; i <= bulk; i++) {
    await trade(api, {
      brokerAccountId: i % 2 === 0 ? groww.id : zerodha.id,
      instrumentId: stockRes.id,
      type: 'buy',
      quantity: 10,
      price: 100 + i,
      tradeDate: day(i),
    });
  }
  await trade(api, { brokerAccountId: groww.id, instrumentId: fundRes.id, type: 'buy', quantity: 50, price: 100, tradeDate: '2026-10-05' });
  const sell = await trade(api, {
    brokerAccountId: zerodha.id,
    instrumentId: stockRes.id,
    type: 'sell',
    quantity: 5,
    price: 400,
    tradeDate: '2026-10-01',
    settlementType: 'delivery',
  });
  return {
    zerodha: { id: zerodha.id, name: 'Zerodha Main' },
    groww: { id: groww.id, name: 'Groww Demat' },
    stock: { id: stockRes.id, symbol, name },
    fund: { id: fundRes.id, name: fundRes.name },
    sellId: sell.id,
    total: bulk + 2,
  };
}

/** Writes an (empty) import commit and an (empty) reconcile commit, so the page has a last import and a last reconcile. */
export async function seedImportJobs(api: ApiClient, brokerAccountId: string): Promise<{ importJobId: string; reconcileJobId: string }> {
  const imported = await api.POST('/api/v1/investments/imports/commit', { body: { source: 'zerodha_tradebook', brokerAccountId, rows: [] } });
  expectStatus(imported, 202);
  const importJobId = (imported.data as { jobId: string }).jobId;
  await waitForJob(api, importJobId);
  const reconciled = await api.POST('/api/v1/investments/imports/reconcile/commit', {
    body: { broker: 'zerodha', brokerAccountId, executions: [] },
  });
  expectStatus(reconciled, 202);
  const reconcileJobId = (reconciled.data as { jobId: string }).jobId;
  await waitForJob(api, reconcileJobId);
  return { importJobId, reconcileJobId };
}
