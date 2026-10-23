import { expect } from '@playwright/test';

import type { ApiClient } from '../api';
import { expectStatus } from '../api';
import { istToday } from '../dates';
import { genCardPdf } from '../gen/statements';
import { createCreditCard } from './accounts';
import { addLending, createCounterparty, createLoan, monthsAhead } from './loans';
import { uploadAndIngest } from './statements';

/**
 * A synthetic card statement whose period ended `endedDaysAgo` days ago (default three; two purchases, 6,000 in all).
 * The generator's own due date depends on the run date, so callers that need a deterministic
 * bill pin the due date through `seedCardBill`.
 */
export async function ingestCardStatement(
  api: ApiClient,
  cardId: string,
  last4: string,
  endedDaysAgo = 3
): Promise<void> {
  const periodEnd = istToday(-endedDaysAgo);
  const pdf = await genCardPdf({
    issuer: 'HDFC Bank',
    cardLast4: last4,
    statementDate: periodEnd,
    periodStart: istToday(-endedDaysAgo - 29),
    periodEnd,
    previousBalance: 0,
    paymentsReceived: 0,
    financeCharges: 0,
    creditLimit: 100000,
    rows: [
      { date: istToday(-endedDaysAgo - 17), description: 'AMAZON ONLINE SHOPPING', debit: 4500 },
      { date: istToday(-endedDaysAgo - 7), description: 'RESTAURANT DINING', debit: 1500 },
    ],
  });
  const { result } = await uploadAndIngest(api, cardId, [{ filename: `card-${last4}.pdf`, buffer: pdf }]);
  expect(result, 'card statement ingest produced a result').not.toBeNull();
}

export interface SeededCardBill {
  cardId: string;
  cardName: string;
  last4: string;
  statementId: string;
}

/**
 * A credit card with one ingested statement whose due date is pinned to `dueInDays` from today
 * (default 2), so the bill is OPEN and inside the inbox's seven-day window whatever day this runs.
 */
export async function seedCardBill(
  api: ApiClient,
  options: { name: string; last4: string; dueInDays?: number }
): Promise<SeededCardBill> {
  const card = await createCreditCard(api, { name: options.name, last4: options.last4 });
  // The server wants the due date 0 to 60 days after the period end, so a past due date ends the period earlier.
  const dueInDays = options.dueInDays ?? 2;
  await ingestCardStatement(api, card.id, options.last4, Math.max(3, 3 - dueInDays));
  const list = await api.GET('/api/v1/bills');
  expectStatus(list, 200);
  const statementId = list.data!.find((b) => b.accountId === card.id)!.statementId!;
  const patched = await api.PATCH('/api/v1/bills/{statementId}/details', {
    params: { path: { statementId } },
    body: { paymentDueDate: istToday(dueInDays), minimumAmountDue: 300 },
  });
  expectStatus(patched, 200);
  return { cardId: card.id, cardName: options.name, last4: options.last4, statementId };
}

/**
 * A loan whose first EMI falls in three days: the current installment is inside the inbox's
 * seven-day window (key `emi:<loanId>:1`) and on the Upcoming page.
 */
export async function seedDueSoonLoan(api: ApiClient, name: string): Promise<{ id: string; name: string }> {
  const loan = await createLoan(api, {
    name,
    principal: 120000,
    annualRatePct: 12,
    tenureMonths: 12,
    startDate: istToday(-27),
    firstEmiDate: istToday(3),
  });
  return { id: loan.id, name };
}

/** A receivable that falls due next month: one `lending_due` row on the Upcoming page. */
export async function seedLendingReceivable(api: ApiClient, counterpartyName: string): Promise<{ counterpartyId: string }> {
  const cp = await createCounterparty(api, { name: counterpartyName });
  await addLending(api, {
    counterpartyId: cp.id,
    direction: 'lent',
    amount: 25000,
    entryDate: istToday(-10),
    expectedReturnDate: monthsAhead(1),
  });
  return { counterpartyId: cp.id };
}
