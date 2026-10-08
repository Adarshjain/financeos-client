import { expect } from '@playwright/test';

import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';
import { expectStatus } from '../api';
import { istToday } from '../dates';
import { genCardPdf } from '../gen/statements';
import { createLoan } from './loans';
import { uploadAndIngest } from './statements';

export type InboxResponse = components['schemas']['InboxResponse'];
export type InboxItemResponse = components['schemas']['InboxItemResponse'];
export type CardBillResponse = components['schemas']['CardBillResponse'];
export type ObligationItemDto = components['schemas']['ObligationItemDto'];

/** Shifts an ISO date by whole days. */
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * A synthetic card statement that closed three days ago with a 6000 total (4500 + 1500).
 * Returns the resulting bill row.
 */
export async function ingestCardStatement(api: ApiClient, cardId: string, last4: string): Promise<CardBillResponse> {
  const periodEnd = istToday(-3);
  const pdf = await genCardPdf({
    issuer: 'HDFC Bank',
    cardLast4: last4,
    statementDate: periodEnd,
    periodStart: istToday(-32),
    periodEnd,
    previousBalance: 0,
    paymentsReceived: 0,
    financeCharges: 0,
    creditLimit: 100000,
    rows: [
      { date: istToday(-20), description: 'AMAZON ONLINE SHOPPING', debit: 4500 },
      { date: istToday(-10), description: 'RESTAURANT DINING', debit: 1500 },
    ],
  });
  const { result } = await uploadAndIngest(api, cardId, [{ filename: `card-${last4}.pdf`, buffer: pdf }]);
  expect(result, 'ingest produced a result').not.toBeNull();
  const list = await api.GET('/api/v1/bills', { params: { query: { accountId: cardId } } });
  expectStatus(list, 200);
  const bill = list.data!.find((b) => b.statementId);
  expect(bill, 'the ingested statement produced a bill').toBeTruthy();
  return bill!;
}

/** Moves a bill's due date (the statement's own date is unpredictable around month ends). */
export async function setBillDue(api: ApiClient, statementId: string, paymentDueDate: string): Promise<CardBillResponse> {
  const res = await api.PATCH('/api/v1/bills/{statementId}/details', {
    params: { path: { statementId } },
    body: { paymentDueDate },
  });
  expectStatus(res, 200);
  return res.data!;
}

/**
 * An active loan whose first installment falls {@code firstEmiInDays} from today (negative = past).
 * The start date is always 30 days earlier than the first EMI and never in the future.
 */
export async function loanWithFirstEmiIn(api: ApiClient, name: string, firstEmiInDays: number) {
  return createLoan(api, {
    name,
    startDate: shiftDate(istToday(Math.min(firstEmiInDays, 0)), -30),
    firstEmiDate: istToday(firstEmiInDays),
    tenureMonths: 12,
  });
}

export async function getInbox(api: ApiClient): Promise<InboxResponse> {
  const res = await api.GET('/api/v1/inbox');
  expectStatus(res, 200);
  return res.data!;
}

export function inboxRow(inbox: InboxResponse, key: string): InboxItemResponse | undefined {
  return inbox.items.find((i) => i.key === key);
}

export async function getObligations(api: ApiClient, query: { months?: number; kinds?: string } = {}) {
  const res = await api.GET('/api/v1/obligations/upcoming', { params: { query } });
  expectStatus(res, 200);
  return res.data!.items;
}
