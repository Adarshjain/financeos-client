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

export type DetectBucket = 'needsReview' | 'appliedAutomatically';
export interface DetectedSuggestion {
  id: string;
  kind: string;
  instrument: { id: string };
}

async function suggestionsOf(api: ApiClient, bucket: DetectBucket, instrumentId: string): Promise<DetectedSuggestion | undefined> {
  const res = await api.GET('/api/v1/corporate-action-suggestions');
  expect(res.response.status).toBe(200);
  return res.data![bucket].find((s) => s.instrument.id === instrumentId) as DetectedSuggestion | undefined;
}

/**
 * The detected suggestion for an instrument as the Corporate actions page lists it (the Inbox only points there and
 * has no row for an automatic one); the detection job runs after the import, so it is polled for.
 */
export async function waitForSuggestion(api: ApiClient, bucket: DetectBucket, instrumentId: string, timeoutMs = 90_000): Promise<DetectedSuggestion> {
  let found: DetectedSuggestion | undefined;
  await expect
    .poll(
      async () => {
        found = await suggestionsOf(api, bucket, instrumentId);
        return found !== undefined;
      },
      { timeout: timeoutMs, intervals: [1000], message: `${bucket} suggestion for ${instrumentId}` },
    )
    .toBe(true);
  return found!;
}

export async function suggestionOf(api: ApiClient, bucket: DetectBucket, instrumentId: string): Promise<DetectedSuggestion | undefined> {
  return suggestionsOf(api, bucket, instrumentId);
}

/** The Inbox rows that point at the Corporate actions page (several are grouped into one "<label>: N to review" row). */
export async function inboxRowsForCorporateActions(api: ApiClient): Promise<InboxItemResponse[]> {
  return (await getInbox(api)).items.filter((i) => i.href === '/investments/corporate-actions');
}
