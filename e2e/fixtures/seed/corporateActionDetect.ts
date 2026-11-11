import { expect } from '@playwright/test';

import type { ApiClient } from '../api';
import { waitForJob } from '../api';
import { createBroker, type InstrumentResponse, resolveInstrument } from './investments';
import { getInbox, type InboxItemResponse } from './nav';

/**
 * The three invented listings the NSE stub (stubs/wiremock/mappings/nse-corporate-actions.json) reports, all with
 * ex-date 15 Jan 2025: a "Bonus 1:1" the Yahoo stub confirms with a 2:1 split event (applied automatically), a "Bonus 1:1"
 * the Yahoo stub has no split for (held for review) and a "Demerger" (always held for review).
 */
export const DETECT_EX_DATE = '2025-01-15';
export const DETECT_BUY_DATE = '2024-06-03';

const LISTINGS = {
  bonus: { symbol: 'E2EBONUS', isin: 'INE2E0000011', name: 'E2E Bonus Industries Limited' },
  miss: { symbol: 'E2EMISS', isin: 'INE2E0000029', name: 'E2E Missing Split Limited' },
  demerge: { symbol: 'E2EDEMERGE', isin: 'INE2E0000037', name: 'E2E Demerger Limited' },
} as const;

export interface DetectSeed {
  brokerAccountId: string;
  bonus: InstrumentResponse;
  miss: InstrumentResponse;
  demerge: InstrumentResponse;
}

/** A new broker account holding 10 shares of each listing, bought on 3 Jun 2024 and imported through a reconcile commit. */
export async function seedDetectablePurchases(api: ApiClient): Promise<DetectSeed> {
  const broker = await createBroker(api);
  const resolved: Record<string, InstrumentResponse> = {};
  for (const [key, l] of Object.entries(LISTINGS)) {
    resolved[key] = await resolveInstrument(api, {
      type: 'stock',
      name: l.name,
      isin: l.isin,
      symbol: l.symbol,
      exchange: 'NSE',
      yahooSymbol: `${l.symbol}.NS`,
    });
  }
  const res = await api.POST('/api/v1/investments/imports/reconcile/commit', {
    body: {
      broker: 'zerodha',
      brokerAccountId: broker.id,
      executions: Object.entries(LISTINGS).map(([key, l], i) => ({
        rowIndex: i + 1,
        symbol: l.symbol,
        isin: l.isin,
        tradeDate: DETECT_BUY_DATE,
        type: 'buy' as const,
        settlementType: 'delivery' as const,
        quantity: 10,
        price: 100,
        instrumentId: resolved[key].id,
        externalRef: `detect-${l.symbol}-${broker.id}`,
      })),
    },
  });
  expect([200, 202]).toContain(res.response.status);
  const job = await waitForJob(api, (res.data as { jobId: string }).jobId);
  expect(job.status).toBe('SUCCEEDED');
  return { brokerAccountId: broker.id, bonus: resolved.bonus, miss: resolved.miss, demerge: resolved.demerge };
}

/** The inbox row of a kind for an instrument; the detection job runs after the import, so it is polled for. */
export async function waitForInboxItem(api: ApiClient, kind: string, instrumentId: string, timeoutMs = 90_000): Promise<InboxItemResponse> {
  let found: InboxItemResponse | undefined;
  await expect
    .poll(
      async () => {
        found = (await getInbox(api)).items.find((i) => i.kind === kind && i.refs.instrumentId === instrumentId);
        return found !== undefined;
      },
      { timeout: timeoutMs, intervals: [1000], message: `inbox item ${kind} for ${instrumentId}` },
    )
    .toBe(true);
  return found!;
}

export async function inboxItemOf(api: ApiClient, kind: string, instrumentId: string): Promise<InboxItemResponse | undefined> {
  return (await getInbox(api)).items.find((i) => i.kind === kind && i.refs.instrumentId === instrumentId);
}
