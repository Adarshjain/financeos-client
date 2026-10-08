import { generateKeyPairSync } from 'node:crypto';

import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { genCardPdf } from '../fixtures/gen/statements';
import { createCreditCard } from '../fixtures/seed/accounts';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

/** A raw uncompressed P-256 point (65 bytes, base64url) — what a browser's PushSubscription carries as p256dh. */
function fakeP256dh(): string {
  const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);
  return raw.toString('base64url');
}

const fakeAuth = Buffer.alloc(16, 7).toString('base64url');

/**
 * A synthetic card statement whose period ended a few days ago. The generator prints the due
 * date as (period-end day + 15, capped at the 28th) in the period-end month, so the bill is
 * OPEN when that lands after today and OVERDUE otherwise; both are valid starting points here.
 */
async function ingestCardStatement(api: Parameters<typeof uploadAndIngest>[0], cardId: string, last4: string) {
  const periodEnd = istToday(-3);
  const periodStart = istToday(-32);
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
    rows: [
      { date: istToday(-20), description: 'AMAZON ONLINE SHOPPING', debit: 4500 },
      { date: istToday(-10), description: 'RESTAURANT DINING', debit: 1500 },
    ],
  });
  const { result } = await uploadAndIngest(api, cardId, [{ filename: `card-${last4}.pdf`, buffer: pdf }]);
  expect(result, 'ingest produced a result').not.toBeNull();
}

test.describe('Bills API', () => {
  test('lists the card bill after a statement is ingested, with the statement figures', async ({ api }) => {
    const card = await createCreditCard(api, { name: 'Bills Card A', last4: '7001' });
    await ingestCardStatement(api, card.id, '7001');

    const res = await api.GET('/api/v1/bills');
    expectStatus(res, 200);
    const bill = res.data!.find((b) => b.accountId === card.id);
    expect(bill, 'the card appears in the bills list').toBeTruthy();
    expect(bill!.accountName).toBe('Bills Card A');
    expect(bill!.last4).toBe('7001');
    expect(bill!.totalAmountDue).toBeCloseTo(6000, 2);
    expect(bill!.paymentDueDate).toBeTruthy();
    expect(['OPEN', 'OVERDUE']).toContain(bill!.status);
    expect(bill!.paidSource).toBe('NONE');
    expect(bill!.remainingAmount).toBeCloseTo(6000, 2);
    expect(bill!.digest?.totalPurchases).toBeCloseTo(6000, 2);
    expect(bill!.digest?.creditLimit).toBeCloseTo(100000, 2);
    expect(bill!.lastNotifiedKind, 'the digest marker is recorded even without push').toBe('RECEIVED');

    const one = await api.GET('/api/v1/bills/{statementId}', { params: { path: { statementId: bill!.statementId } } });
    expectStatus(one, 200);
    expect(one.data!.statementId).toBe(bill!.statementId);
  });

  test('mark as paid (full and partial), undo, and the details patch', async ({ api }) => {
    const card = await createCreditCard(api, { name: 'Bills Card B', last4: '7002' });
    await ingestCardStatement(api, card.id, '7002');
    const list = await api.GET('/api/v1/bills');
    const bill = list.data!.find((b) => b.accountId === card.id)!;
    const statementId = bill.statementId;

    const partial = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId } },
      body: { amount: 1000, paidOn: istToday(-1) },
    });
    expectStatus(partial, 200);
    expect(partial.data!.paidSource).toBe('MANUAL');
    expect(partial.data!.paidAmount).toBeCloseTo(1000, 2);
    expect(partial.data!.remainingAmount).toBeCloseTo(5000, 2);
    expect(['PARTIAL', 'OVERDUE']).toContain(partial.data!.status);
    expect(partial.data!.paidMarkedOn).toBe(istToday(-1));

    const full = await api.POST('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId } }, body: {} });
    expectStatus(full, 200);
    expect(full.data!.status).toBe('PAID');
    expect(full.data!.remainingAmount).toBe(0);
    expect(full.data!.paidMarkedOn).toBe(istToday());
    expect(full.data!.lastNotifiedKind).toBe('PAID');

    const undo = await api.DELETE('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId } } });
    expectStatus(undo, 200);
    expect(['OPEN', 'OVERDUE']).toContain(undo.data!.status);
    expect(undo.data!.paidSource).toBe('NONE');
    expect(undo.data!.lastNotifiedKind).toBe('RECEIVED');

    const newDue = istToday(10);
    const patched = await api.PATCH('/api/v1/bills/{statementId}/details', {
      params: { path: { statementId } },
      body: { paymentDueDate: newDue, minimumAmountDue: 300 },
    });
    expectStatus(patched, 200);
    expect(patched.data!.paymentDueDate).toBe(newDue);
    expect(patched.data!.minimumAmountDue).toBeCloseTo(300, 2);
    expect(patched.data!.status).toBe('OPEN');
    expect(patched.data!.daysUntilDue).toBe(10);
  });

  test('validation: future paid date, non-positive amount, empty patch, negative amounts', async ({ api }) => {
    const card = await createCreditCard(api, { name: 'Bills Card C', last4: '7003' });
    await ingestCardStatement(api, card.id, '7003');
    const list = await api.GET('/api/v1/bills');
    const statementId = list.data!.find((b) => b.accountId === card.id)!.statementId;

    expectStatus(await api.POST('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId } }, body: { paidOn: istToday(1) } }), 400);
    expectStatus(await api.POST('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId } }, body: { amount: 0 } }), 400);
    expectStatus(await api.PATCH('/api/v1/bills/{statementId}/details', { params: { path: { statementId } }, body: {} }), 400);
    expectStatus(await api.PATCH('/api/v1/bills/{statementId}/details', { params: { path: { statementId } }, body: { totalAmountDue: -1 } }), 400);
    expectStatus(await api.GET('/api/v1/bills/{statementId}', { params: { path: { statementId: '00000000-0000-0000-0000-000000000000' } } }), 404);
  });

  test('tenancy and authentication', async ({ api, request }) => {
    const card = await createCreditCard(api, { name: 'Bills Card D', last4: '7004' });
    await ingestCardStatement(api, card.id, '7004');
    const statementId = (await api.GET('/api/v1/bills')).data!.find((b) => b.accountId === card.id)!.statementId;

    const { api: apiB } = await secondUser(request, 'bills-b');
    const other = await apiB.GET('/api/v1/bills');
    expectStatus(other, 200);
    expect(other.data!.some((b) => b.statementId === statementId)).toBe(false);
    await expectForeign(apiB, 'GET', `/api/v1/bills/${statementId}`);
    await expectForeign(apiB, 'POST', `/api/v1/bills/${statementId}/mark-paid`, {});
    await expectForeign(apiB, 'PATCH', `/api/v1/bills/${statementId}/details`, { paymentDueDate: istToday(5) });

    await expectUnauthenticated('GET', '/api/v1/bills');
    await expectUnauthenticated('GET', '/api/v1/notifications/settings');
  });
});

test.describe('Notification settings API', () => {
  test('defaults, partial updates and validation', async ({ api }) => {
    const defaults = await api.GET('/api/v1/notifications/settings');
    expectStatus(defaults, 200);
    expect(defaults.data!.pushEnabled).toBe(true);
    expect(defaults.data!.sendHour).toBe(9);
    expect(defaults.data!.reminderOffsets).toEqual([7, 3, 1, 0]);
    expect(defaults.data!.kinds).toEqual({ STATEMENT_RECEIVED: true, BILL_DUE_REMINDER: true, BILL_OVERDUE: true });
    expect(defaults.data!.devices).toEqual([]);
    expect(defaults.data!.pushConfigured, 'the e2e server has no VAPID keys').toBe(false);

    const updated = await api.PUT('/api/v1/notifications/settings', {
      body: { sendHour: 20, reminderOffsets: [1, 14, 1], kinds: { BILL_OVERDUE: false } },
    });
    expectStatus(updated, 200);
    expect(updated.data!.sendHour).toBe(20);
    expect(updated.data!.reminderOffsets).toEqual([14, 1]);
    expect(updated.data!.kinds.BILL_OVERDUE).toBe(false);
    expect(updated.data!.kinds.BILL_DUE_REMINDER).toBe(true);
    expect(updated.data!.pushEnabled).toBe(true);

    expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { sendHour: 24 } }), 400);
    expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { reminderOffsets: [] } }), 400);
    expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { reminderOffsets: [99] } }), 400);
    expectStatus(await api.PUT('/api/v1/notifications/settings', { body: { kinds: { NOT_A_KIND: true } } }), 400);

    const key = await api.GET('/api/v1/notifications/push/public-key');
    expectStatus(key, 200);
    expect(key.data!.configured).toBe(false);
    expectStatus(await api.POST('/api/v1/notifications/push/test'), 400);
  });

  test('device subscriptions are validated, deduplicated and removable', async ({ api }) => {
    const p256dh = fakeP256dh();
    const endpoint = `https://push.example.com/send/${Date.now()}`;

    expectStatus(await api.POST('/api/v1/notifications/push/subscriptions', { body: { endpoint: 'http://push.example.com/x', keys: { p256dh, auth: fakeAuth } } }), 400);
    expectStatus(await api.POST('/api/v1/notifications/push/subscriptions', { body: { endpoint, keys: { p256dh: 'AAAA', auth: fakeAuth } } }), 400);
    expectStatus(await api.POST('/api/v1/notifications/push/subscriptions', { body: { endpoint, keys: { p256dh, auth: 'AA' } } }), 400);

    const added = await api.POST('/api/v1/notifications/push/subscriptions', {
      body: { endpoint, keys: { p256dh, auth: fakeAuth }, userAgent: 'Chrome · Android' },
    });
    expectStatus(added, 200);
    expect(added.data!.devices).toHaveLength(1);
    expect(added.data!.devices[0].endpoint).toBe(endpoint);
    expect(added.data!.devices[0].userAgent).toBe('Chrome · Android');

    const again = await api.POST('/api/v1/notifications/push/subscriptions', { body: { endpoint, keys: { p256dh, auth: fakeAuth } } });
    expectStatus(again, 200);
    expect(again.data!.devices, 'same endpoint replaces, never duplicates').toHaveLength(1);

    const removed = await api.POST('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint } });
    expectStatus(removed, 200);
    expect(removed.data!.devices).toEqual([]);
  });

  test('per-card mute shows up in settings and on the bill', async ({ api, request }) => {
    const card = await createCreditCard(api, { name: 'Muted Card', last4: '7005' });
    await ingestCardStatement(api, card.id, '7005');

    const muted = await api.PUT('/api/v1/notifications/accounts/{accountId}/mute', { params: { path: { accountId: card.id } }, body: { muted: true } });
    expectStatus(muted, 200);
    expect(muted.data!.mutedAccountIds).toContain(card.id);
    const bill = (await api.GET('/api/v1/bills')).data!.find((b) => b.accountId === card.id)!;
    expect(bill.muted).toBe(true);

    const unmuted = await api.PUT('/api/v1/notifications/accounts/{accountId}/mute', { params: { path: { accountId: card.id } }, body: { muted: false } });
    expect(unmuted.data!.mutedAccountIds).not.toContain(card.id);

    const { api: apiB } = await secondUser(request, 'mute-b');
    await expectForeign(apiB, 'PUT', `/api/v1/notifications/accounts/${card.id}/mute`, { muted: true });
  });
});
