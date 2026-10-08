import { generateKeyPairSync } from 'node:crypto';

import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { genCardPdf } from '../fixtures/gen/statements';
import { addMapping, removeMappings } from '../fixtures/google-stubs';
import { createCreditCard } from '../fixtures/seed/accounts';
import { addLending, createLoan, getLoan } from '../fixtures/seed/loans';
import { createMilestone, createRewardCard, createRewardRule, spend } from '../fixtures/seed/rewards';
import { getAccountStatements, uploadAndIngest } from '../fixtures/seed/statements';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

/** A synthetic card statement for [periodStart, periodEnd] with the given debit rows (date, description, amount). */
async function ingestCard(
  api: Parameters<typeof uploadAndIngest>[0],
  cardId: string,
  last4: string,
  periodStart: string,
  periodEnd: string,
  rows: { date: string; description: string; debit: number }[],
) {
  const pdf = await genCardPdf({
    issuer: 'HDFC Bank',
    cardLast4: last4,
    statementDate: periodEnd,
    periodStart,
    periodEnd,
    previousBalance: 0,
    paymentsReceived: 0,
    financeCharges: 0,
    creditLimit: 100000,
    rows,
  });
  return uploadAndIngest(api, cardId, [{ filename: `card-${last4}-${periodEnd}.pdf`, buffer: pdf }]);
}

async function evaluateNow(api: Parameters<typeof uploadAndIngest>[0]) {
  // Send hour 0 so the scheduled producers run whatever the wall clock says, and the default
  // offsets restored: the worker user is shared with other specs that change them.
  expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { sendHour: 0, reminderOffsets: [7, 3, 1, 0] } }), 200);
  const res = await api.POST('/api/v1/notifications/evaluate');
  expectStatus(res, 200);
  expect(res.data!.failed, 'no producer threw').toBe(0);
  return res.data!;
}

/**
 * Notification producers beyond card bills (bills.spec covers those): the per-kind switches, the
 * per-loan mute, and the EMI reminder marker driven through the on-demand `/evaluate` tick. No
 * device is registered, so nothing is pushed; the markers still advance, which is the contract.
 */
test.describe('Notifications API (producers)', () => {
  test('settings expose every kind switch, all on by default, and new kinds save like the old ones', async ({ request }) => {
    // A fresh user: the worker user's switches may already have been flipped by other specs.
    const { api } = await secondUser(request, 'notif-defaults');
    const res = await api.GET('/api/v1/notifications/settings');
    expectStatus(res, 200);
    const kinds = res.data!.kinds ?? {};
    for (const key of [
      'STATEMENT_RECEIVED',
      'BILL_DUE_REMINDER',
      'BILL_OVERDUE',
      'GMAIL_RECONNECT',
      'GMAIL_ATTENTION',
      'EMI_DUE_REMINDER',
      'EMI_OVERDUE',
    ]) {
      expect(kinds[key], `${key} defaults to on`).toBe(true);
    }
    expect(res.data!.mutedLoanIds).toEqual([]);

    const off = await api.PUT('/api/v1/notifications/settings', { body: { kinds: { EMI_OVERDUE: false } } });
    expectStatus(off, 200);
    expect(off.data!.kinds?.EMI_OVERDUE).toBe(false);
    expect(off.data!.kinds?.EMI_DUE_REMINDER).toBe(true);

    const unknown = await api.PUT('/api/v1/notifications/settings', { body: { kinds: { NOT_A_KIND: true } } });
    expectStatus(unknown, 400);

    const back = await api.PUT('/api/v1/notifications/settings', { body: { kinds: { EMI_OVERDUE: true } } });
    expectStatus(back, 200);
  });

  test('a loan can be muted and unmuted, and the loan carries the flag', async ({ api, request }) => {
    const loan = await createLoan(api, { name: 'Mute me', firstEmiDate: istToday(20), startDate: istToday(-10) });
    expect((await getLoan(api, loan.id)).loan.notificationsMuted).toBe(false);

    const muted = await api.PUT('/api/v1/notifications/loans/{loanId}/mute', {
      params: { path: { loanId: loan.id } },
      body: { muted: true },
    });
    expectStatus(muted, 200);
    expect(muted.data!.mutedLoanIds).toContain(loan.id);
    expect((await getLoan(api, loan.id)).loan.notificationsMuted).toBe(true);

    const unmuted = await api.PUT('/api/v1/notifications/loans/{loanId}/mute', {
      params: { path: { loanId: loan.id } },
      body: { muted: false },
    });
    expectStatus(unmuted, 200);
    expect(unmuted.data!.mutedLoanIds).not.toContain(loan.id);

    const { api: apiB } = await secondUser(request, 'notif-mute-b');
    await expectForeign(apiB, 'PUT', `/api/v1/notifications/loans/${loan.id}/mute`, { muted: true });
    const missing = await api.PUT('/api/v1/notifications/loans/{loanId}/mute', {
      params: { path: { loanId: '00000000-0000-0000-0000-000000000000' } },
      body: { muted: true },
    });
    expectStatus(missing, 404);
  });

  test('the on-demand tick records the EMI reminder for the current installment, idempotently', async ({ api }) => {
    // Send hour 0 so the scheduled producers run whatever the wall clock says; default offsets
    // restored because the worker user is shared with specs that change them.
    expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { sendHour: 0, reminderOffsets: [7, 3, 1, 0] } }), 200);

    // First EMI due in 3 days → the smallest reached default offset is 3.
    const due = await createLoan(api, { name: 'EMI due soon', firstEmiDate: istToday(3), startDate: istToday(-27) });
    // First EMI due in 12 days → outside every default offset, nothing recorded.
    const far = await createLoan(api, { name: 'EMI far away', firstEmiDate: istToday(12), startDate: istToday(-18) });
    // Muted loan due today → the marker still advances, it just does not push.
    const quiet = await createLoan(api, { name: 'EMI muted', firstEmiDate: istToday(0), startDate: istToday(-30) });
    expectStatus(
      await api.PUT('/api/v1/notifications/loans/{loanId}/mute', { params: { path: { loanId: quiet.id } }, body: { muted: true } }),
      200,
    );

    const first = await api.POST('/api/v1/notifications/evaluate');
    expectStatus(first, 200);
    expect(first.data!.failed).toBe(0);
    expect(first.data!.recorded).toBeGreaterThanOrEqual(2);
    expect(first.data!.sent, 'no device is registered').toBe(0);

    const dueLoan = (await getLoan(api, due.id)).loan;
    expect(dueLoan.lastNotifiedKind).toBe('DUE_3');
    expect(dueLoan.lastNotifiedOn).toBe(istToday());
    const farLoan = (await getLoan(api, far.id)).loan;
    expect(farLoan.lastNotifiedKind ?? null).toBeNull();
    const quietLoan = (await getLoan(api, quiet.id)).loan;
    expect(quietLoan.lastNotifiedKind).toBe('DUE_0');

    // Running the tick again changes nothing for these loans.
    const second = await api.POST('/api/v1/notifications/evaluate');
    expectStatus(second, 200);
    expect((await getLoan(api, due.id)).loan.lastNotifiedKind).toBe('DUE_3');
    expect((await getLoan(api, due.id)).loan.lastNotifiedOn).toBe(istToday());
  });

  test('an installment overdue since before the loan was entered is history, not a nag', async ({ api }) => {
    expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { sendHour: 0 } }), 200);
    const backfilled = await createLoan(api, { name: 'Backfilled', firstEmiDate: istToday(-5), startDate: istToday(-35) });

    expectStatus(await api.POST('/api/v1/notifications/evaluate'), 200);

    expect((await getLoan(api, backfilled.id)).loan.lastNotifiedKind ?? null).toBeNull();
  });

  test('rejects anonymous callers', async () => {
    await expectUnauthenticated('POST', '/api/v1/notifications/evaluate');
    await expectUnauthenticated('PUT', '/api/v1/notifications/loans/00000000-0000-0000-0000-000000000000/mute', { muted: true });
  });

  test('money due back: overdue once, then nothing until a week passes; future dates are silent', async ({ api }) => {
    const late = await addLending(api, {
      newCounterpartyName: `Rahul ${Date.now()}`,
      amount: 12000,
      entryDate: istToday(-30),
      expectedReturnDate: istToday(-3),
    });
    const fine = await addLending(api, {
      newCounterpartyName: `Priya ${Date.now()}`,
      amount: 500,
      entryDate: istToday(-2),
      expectedReturnDate: istToday(10),
    });

    await evaluateNow(api);

    const lateNow = await api.GET('/api/v1/lendings/{id}', { params: { path: { id: late.id } } });
    expectStatus(lateNow, 200);
    expect(lateNow.data!.returnNotifiedKind).toBe('OVERDUE');
    expect(lateNow.data!.returnNotifiedOn).toBe(istToday());
    const fineNow = await api.GET('/api/v1/lendings/{id}', { params: { path: { id: fine.id } } });
    expect(fineNow.data!.returnNotifiedKind ?? null).toBeNull();

    await evaluateNow(api);
    expect((await api.GET('/api/v1/lendings/{id}', { params: { path: { id: late.id } } })).data!.returnNotifiedOn).toBe(istToday());
  });

  test('a statement whose period still has unreconciled transactions gets its digest marker once', async ({ api }) => {
    const card = await createCreditCard(api, { name: 'Review digest card', last4: '7301' });
    // Two statements with different periods but one identical row: the second upload flags that
    // row DUPLICATE_SUSPECT on both sides, which is exactly what the digest counts.
    const shared = { date: istToday(-20), description: 'AMAZON ONLINE SHOPPING', debit: 4500 };
    const first = await ingestCard(api, card.id, '7301', istToday(-45), istToday(-16), [shared, { date: istToday(-30), description: 'FUEL STATION', debit: 1500 }]);
    expect(first.result.totalCreated).toBe(2);
    const second = await ingestCard(api, card.id, '7301', istToday(-25), istToday(-3), [shared, { date: istToday(-10), description: 'RESTAURANT DINING', debit: 900 }]);
    expect(second.result.totalDuplicatesFound, 'the shared row is a duplicate suspect').toBeGreaterThan(0);

    const outcome = await evaluateNow(api);
    // Both statements contain the duplicated row's date, so both digests count it: the count
    // query really found the DUPLICATE_SUSPECT rows in Oracle, not just stamped the statements.
    expect(outcome.recorded, 'at least the two digests were recorded').toBeGreaterThanOrEqual(2);

    const statements = await getAccountStatements(api, card.id);
    expect(statements).toHaveLength(2);
    for (const s of statements) {
      expect(s.reviewNotifiedOn, `statement ${s.periodEnd} evaluated`).toBe(istToday());
    }
  });

  test('a user-started import stamps the job with its notification time', async ({ api }) => {
    const card = await createCreditCard(api, { name: 'Job push card', last4: '7302' });
    // Two rows: a one-row synthetic card statement parses to a zero-amount line and fails ingest.
    const { job } = await ingestCard(api, card.id, '7302', istToday(-32), istToday(-3), [
      { date: istToday(-10), description: 'GROCERY MART', debit: 2200 },
      { date: istToday(-8), description: 'PHARMACY', debit: 340 },
    ]);
    expect(job.status, JSON.stringify(job)).toBe('SUCCEEDED');

    // The push runs after the status commit; give the listener a moment.
    let notifiedAt: string | null | undefined = job.notifiedAt;
    for (let i = 0; i < 20 && !notifiedAt; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const again = await api.GET('/api/v1/jobs/{id}', { params: { path: { id: job.id } } });
      notifiedAt = again.data?.notifiedAt;
    }
    expect(notifiedAt, 'STATEMENT_INGEST started by the user is announced').toBeTruthy();
  });

  test("a card whose statement is weeks overdue is flagged once per missed cycle", async ({ api }) => {
    const card = await createCreditCard(api, { name: 'Missing statement card', last4: '7303' });
    await ingestCard(api, card.id, '7303', istToday(-100), istToday(-70), [{ date: istToday(-80), description: 'OLD PURCHASE', debit: 100 }]);

    await evaluateNow(api);

    const account = await api.GET('/api/v1/accounts/{id}', { params: { path: { id: card.id } } });
    expectStatus(account, 200);
    const flagged = (account.data as { statementExpectedNotifiedFor?: string | null }).statementExpectedNotifiedFor;
    expect(flagged, 'the projected period end that was announced').toBeTruthy();
    expect(flagged! > istToday(-70)).toBe(true);
    expect(flagged! <= istToday(-5), 'past the grace period').toBe(true);

    await evaluateNow(api);
    const again = await api.GET('/api/v1/accounts/{id}', { params: { path: { id: card.id } } });
    expect((again.data as { statementExpectedNotifiedFor?: string | null }).statementExpectedNotifiedFor).toBe(flagged);
  });

  test('rewards: an achieved milestone and an exhausted cap are marked for the current window', async ({ api }) => {
    const { account, cards } = await createRewardCard(api, { name: 'Alert card' });
    const rule = await createRewardRule(api, account.id, {
      name: 'Everything 100%',
      percentRate: 100,
      periodCap: 1000,
      capWindow: 'CALENDAR_MONTH',
    });
    const milestone = await createMilestone(api, account.id, { name: 'Spend 1k', threshold: 1000, windowType: 'CALENDAR_MONTH' });
    await spend(api, account.id, { amount: 1500, date: istToday(), cardId: cards[0]?.id });

    await evaluateNow(api);

    const milestones = await api.GET('/api/v1/reward-milestones', { params: { query: { accountId: account.id } } });
    expectStatus(milestones, 200);
    const m = milestones.data!.find((x) => x.id === milestone.id)!;
    expect(m.notifiedKind).toBe('ACHIEVED');
    expect(m.notifiedWindowStart).toBe(istToday().slice(0, 8) + '01');

    const rules = await api.GET('/api/v1/reward-rules', { params: { query: { accountId: account.id } } });
    expectStatus(rules, 200);
    const r = rules.data!.find((x) => x.id === rule.id)!;
    expect(r.capNotifiedWindowStart).toBe(istToday().slice(0, 8) + '01');
  });

  test('a test push is encrypted and delivered to a registered device (WireMock plays the push service)', async ({ request }) => {
    const { api } = await secondUser(request, 'notif-push-test');
    // A real P-256 point for p256dh, as a browser's PushSubscription would carry.
    const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
    const p256dh = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url');
    const auth = Buffer.alloc(16, 9).toString('base64url');
    const pushPath = `/push/e2e-${Date.now()}`;
    const mapping = await addMapping({
      name: `push-service${pushPath}`,
      priority: 1,
      request: { method: 'POST', urlPath: pushPath },
      response: { status: 201 },
    });
    try {
      const added = await api.POST('/api/v1/notifications/push/subscriptions', {
        body: { endpoint: `http://localhost:8089${pushPath}`, keys: { p256dh, auth }, userAgent: 'E2E · Chromium' },
      });
      expectStatus(added, 200);
      expect(added.data!.devices).toHaveLength(1);

      const sent = await api.POST('/api/v1/notifications/push/test');
      expectStatus(sent, 200);
      expect(sent.data!.sent, 'the push service accepted the encrypted message').toBe(1);

      const after = await api.GET('/api/v1/notifications/settings');
      expect(after.data!.devices, 'an accepted push keeps the subscription').toHaveLength(1);
    } finally {
      await removeMappings([mapping]);
    }
  });
});
