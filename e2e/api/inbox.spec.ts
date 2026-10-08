import { expectStatus } from '../fixtures/api';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { istToday } from '../fixtures/dates';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { addLending, createCounterparty, pay } from '../fixtures/seed/loans';
import { getInbox, inboxRow, ingestCardStatement, loanWithFirstEmiIn, setBillDue, shiftDate } from '../fixtures/seed/nav';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expectUnauthenticated, newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const emiKey = (loanId: string, seq = 1) => `emi:${loanId}:${seq}`;

test.describe('Inbox API: reads (@api)', () => {
  test('a user with nothing pending gets an empty inbox and a zero badge', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-empty');
    const inbox = await getInbox(api);
    expect(inbox.items).toEqual([]);
    expect(inbox.summary).toEqual({ actNow: 0, needsLook: 0, info: 0, badge: 0 });
    expect(Number.isNaN(Date.parse(inbox.generatedAt))).toBe(false);

    const summary = await api.GET('/api/v1/inbox/summary');
    expectStatus(summary, 200);
    expect(summary.data).toEqual({ actNow: 0, needsLook: 0, info: 0, badge: 0 });
  });

  test('an EMI due within 7 days is an act_now warning row that opens the installment', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-emi');
    const loan = await loanWithFirstEmiIn(api, 'Inbox EMI Loan', 3);

    const inbox = await getInbox(api);
    const row = inboxRow(inbox, emiKey(loan.id));
    expect(row, 'EMI #1 is listed').toBeTruthy();
    expect(row).toMatchObject({
      kind: 'emi',
      rowType: 'item',
      section: 'act_now',
      severity: 'warning',
      title: 'Inbox EMI Loan: EMI #1',
      date: istToday(3),
      href: `/loans/${loan.id}?installment=1`,
    });
    expect(Number(row!.amount)).toBeGreaterThan(0);
    expect(row!.refs).toBeTruthy();
    expect(row!.actions.map((a) => a.type)).toEqual(['open', 'snooze']);
    expect(row!.actions[0].href).toBe(`/loans/${loan.id}?installment=1`);
    expect(inbox.summary).toMatchObject({ actNow: 1, needsLook: 0, badge: 1 });
  });

  test('the EMI window is 7 days: day 7 is listed, day 8 is not', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-emi-window');
    const inside = await loanWithFirstEmiIn(api, 'Window Inside', 7);
    const outside = await loanWithFirstEmiIn(api, 'Window Outside', 8);

    const inbox = await getInbox(api);
    expect(inboxRow(inbox, emiKey(inside.id))).toBeTruthy();
    expect(inboxRow(inbox, emiKey(outside.id))).toBeUndefined();
  });

  test('paying the installment removes its row', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-emi-paid');
    const loan = await loanWithFirstEmiIn(api, 'Inbox Paid Loan', 2);
    const row = inboxRow(await getInbox(api), emiKey(loan.id))!;
    expect(row).toBeTruthy();

    await pay(api, loan.id, { installmentSeq: 1, amount: Number(row.amount), paymentDate: istToday() });
    expect(inboxRow(await getInbox(api), emiKey(loan.id))).toBeUndefined();
  });

  test('an installment already overdue when the loan was entered is backfilled history, not an inbox row', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-emi-stale');
    const loan = await loanWithFirstEmiIn(api, 'Backfilled Loan', -5);
    const inbox = await getInbox(api);
    expect(inboxRow(inbox, emiKey(loan.id))).toBeUndefined();
  });

  test('a card bill due within 7 days is listed with its amount, due date and mark-paid action', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-bill');
    const card = await createCreditCard(api, { name: 'Inbox Card', last4: '8101' });
    const bill = await ingestCardStatement(api, card.id, '8101');
    await setBillDue(api, bill.statementId!, istToday(3));

    const row = inboxRow(await getInbox(api), `bill:${bill.statementId}`);
    expect(row, 'the bill is listed').toBeTruthy();
    expect(row).toMatchObject({
      kind: 'bill',
      rowType: 'item',
      section: 'act_now',
      severity: 'warning',
      title: 'Inbox Card ••8101 bill',
      date: istToday(3),
      href: `/upcoming?bill=${bill.statementId}`,
    });
    expect(Number(row!.amount)).toBeCloseTo(6000, 2);
    expect(row!.actions.map((a) => a.type)).toEqual(['mark_paid', 'snooze']);
    expect(row!.actions[0].payload).toBeTruthy();
  });

  test('bill window: day 7 listed, day 8 not; overdue is critical; paying removes it', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-bill-window');
    const card = await createCreditCard(api, { name: 'Window Card', last4: '8102' });
    const bill = await ingestCardStatement(api, card.id, '8102');
    const key = `bill:${bill.statementId}`;

    await setBillDue(api, bill.statementId!, istToday(8));
    expect(inboxRow(await getInbox(api), key), 'due in 8 days stays out').toBeUndefined();

    await setBillDue(api, bill.statementId!, istToday(7));
    expect(inboxRow(await getInbox(api), key), 'due in 7 days is in').toBeTruthy();

    await setBillDue(api, bill.statementId!, istToday(-2));
    const overdue = inboxRow(await getInbox(api), key);
    expect(overdue).toMatchObject({ severity: 'critical', section: 'act_now', date: istToday(-2) });

    const paid = await api.POST('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId: bill.statementId! } }, body: {} });
    expectStatus(paid, 200);
    expect(inboxRow(await getInbox(api), key), 'a paid bill is gone').toBeUndefined();
  });

  test('a partly paid bill shows what is already paid; a muted card is left out; an awaiting card never appears', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-bill-misc');
    const card = await createCreditCard(api, { name: 'Partial Card', last4: '8103' });
    const awaiting = await createCreditCard(api, { name: 'Awaiting Card', last4: '8104' });
    const bill = await ingestCardStatement(api, card.id, '8103');
    await setBillDue(api, bill.statementId!, istToday(2));
    const key = `bill:${bill.statementId}`;

    const partial = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId! } },
      body: { amount: 1000 },
    });
    expectStatus(partial, 200);
    const row = inboxRow(await getInbox(api), key);
    expect(row).toBeTruthy();
    expect(Number(row!.amount), 'the amount is what remains').toBeCloseTo(5000, 2);
    expect(row!.subtitle).toContain('already paid');

    const all = await getInbox(api);
    expect(all.items.some((i) => i.key.includes(awaiting.id)), 'AWAITING_STATEMENT cards are not inbox rows').toBe(false);

    const mute = await api.PUT('/api/v1/notifications/accounts/{accountId}/mute', { params: { path: { accountId: card.id } }, body: { muted: true } });
    expectStatus(mute, 200);
    expect(inboxRow(await getInbox(api), key), 'a muted card is silent').toBeUndefined();
  });

  test('money due back within a week is a lending row; further out is not', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-lending');
    const near = await createCounterparty(api, { name: 'Near Friend' });
    await addLending(api, { counterpartyId: near.id, direction: 'lent', amount: 4000, entryDate: shiftDate(istToday(), -20), expectedReturnDate: istToday(2) });
    const far = await createCounterparty(api, { name: 'Far Friend' });
    await addLending(api, { counterpartyId: far.id, direction: 'lent', amount: 900, entryDate: shiftDate(istToday(), -20), expectedReturnDate: istToday(20) });
    const owed = await createCounterparty(api, { name: 'Lender Pal' });
    await addLending(api, { counterpartyId: owed.id, direction: 'borrowed', amount: 700, entryDate: shiftDate(istToday(), -20), expectedReturnDate: istToday(4) });

    const inbox = await getInbox(api);
    const lent = inboxRow(inbox, `lending:${near.id}`);
    expect(lent).toMatchObject({ kind: 'lending', section: 'act_now', severity: 'warning', title: 'Near Friend owes you', date: istToday(2) });
    expect(Number(lent!.amount)).toBe(4000);
    expect(lent!.href).toBe(`/loans/lendings/${near.id}?export=1`);
    const borrowed = inboxRow(inbox, `lending:${owed.id}`);
    expect(borrowed).toMatchObject({ title: 'You owe Lender Pal' });
    expect(borrowed!.href).toBe(`/loans/lendings/${owed.id}`);
    expect(inboxRow(inbox, `lending:${far.id}`)).toBeUndefined();
  });

  test('a finished ingest job is an info row that does not count towards the badge', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-job');
    const card = await createCreditCard(api, { name: 'Job Card', last4: '8105' });
    await ingestCardStatement(api, card.id, '8105');

    const inbox = await getInbox(api);
    const jobs = inbox.items.filter((i) => i.kind === 'job');
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0]).toMatchObject({ section: 'info', severity: 'info', rowType: 'item' });
    expect(jobs[0].key.startsWith('job:')).toBe(true);
    expect(jobs[0].actions.map((a) => a.type)).toEqual(['open', 'dismiss']);
    expect(inbox.summary.info).toBe(jobs.length);
    expect(inbox.summary.badge).toBe(inbox.summary.actNow + inbox.summary.needsLook);
  });

  test('rows are ordered by section, then severity, then date', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-order');
    const card = await createCreditCard(api, { name: 'Order Card', last4: '8106' });
    const bill = await ingestCardStatement(api, card.id, '8106');
    await setBillDue(api, bill.statementId!, istToday(-1)); // critical
    const later = await loanWithFirstEmiIn(api, 'Order Later', 5); // warning, day 5
    const sooner = await loanWithFirstEmiIn(api, 'Order Sooner', 2); // warning, day 2

    const keys = (await getInbox(api)).items.map((i) => i.key);
    const iBill = keys.indexOf(`bill:${bill.statementId}`);
    const iSooner = keys.indexOf(emiKey(sooner.id));
    const iLater = keys.indexOf(emiKey(later.id));
    expect(iBill).toBeGreaterThanOrEqual(0);
    expect(iBill, 'critical before warning').toBeLessThan(iSooner);
    expect(iSooner, 'sooner date first within a severity').toBeLessThan(iLater);
    const sections = (await getInbox(api)).items.map((i) => i.section);
    const rank = { act_now: 0, needs_look: 1, info: 2 } as Record<string, number>;
    expect(sections.map((s) => rank[s])).toEqual([...sections.map((s) => rank[s])].sort((a, b) => a - b));
  });
});

test.describe('Inbox API: summary rows (@api)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  const reviewSpec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '9988776611',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 50000.0,
    rows: [
      { date: '2026-04-05', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 650.0 },
      { date: '2026-04-05', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 650.0 },
      { date: '2026-04-12', description: 'UBER TRIP MUMBAI AIRPORT', debit: 1250.0 },
    ],
  };

  test('the review queue is one needs_look summary row: dismissable, never snoozable, counted in the badge', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-review');
    const account = await createBankAccount(api, { name: 'Inbox Review Account' });
    const pdf = await genBankPdf(reviewSpec);
    await uploadAndIngest(api, account.id, [{ filename: 'inbox-review.pdf', buffer: pdf }]);

    const before = await getInbox(api);
    const row = inboxRow(before, 'review');
    expect(row, 'the review summary row is listed').toBeTruthy();
    expect(row).toMatchObject({
      kind: 'review',
      rowType: 'summary',
      section: 'needs_look',
      severity: 'warning',
      title: 'Transactions to review',
      href: '/transactions/review',
    });
    expect(row!.count).toBeGreaterThanOrEqual(1);
    expect(row!.amount ?? null).toBeNull();
    expect(row!.date ?? null).toBeNull();
    expect(row!.actions.map((a) => a.type)).toEqual(['review']);
    expect(before.summary.needsLook).toBe(1);
    expect(before.summary.badge).toBe(before.summary.actNow + 1);

    const snooze = await api.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key: 'review' } }, body: { until: istToday(3) } });
    expectStatus(snooze, 400);
    expect(snooze.error?.code).toBe('VALIDATION_ERROR');

    const dismissed = await api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key: 'review' } } });
    expectStatus(dismissed, 200);
    expect(inboxRow(dismissed.data!, 'review')).toBeUndefined();
    expect(dismissed.data!.summary.needsLook).toBe(0);

    const restored = await api.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key: 'review' } } });
    expectStatus(restored, 200);
    expect(inboxRow(restored.data!, 'review')).toBeTruthy();
  });
});

test.describe('Inbox API: snooze, dismiss and undo (@api)', () => {
  test('snooze hides an item row and undo brings it back; every write returns the fresh inbox', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-snooze');
    const loan = await loanWithFirstEmiIn(api, 'Snooze Loan', 2);
    const key = emiKey(loan.id);
    const until = istToday(3);

    const snoozed = await api.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: { until } });
    expectStatus(snoozed, 200);
    expect(inboxRow(snoozed.data!, key), 'the snoozed row is hidden in the response').toBeUndefined();
    expect(snoozed.data!.summary.badge).toBe(0);
    expect(inboxRow(await getInbox(api), key)).toBeUndefined();
    const summary = await api.GET('/api/v1/inbox/summary');
    expect(summary.data!.badge).toBe(0);

    const cleared = await api.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key } } });
    expectStatus(cleared, 200);
    expect(inboxRow(cleared.data!, key)).toBeTruthy();
    expect(cleared.data!.summary.badge).toBe(1);
  });

  test('snooze can be moved to another date and still hides the row', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-resnooze');
    const loan = await loanWithFirstEmiIn(api, 'Resnooze Loan', 2);
    const key = emiKey(loan.id);
    expectStatus(await api.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: { until: istToday(2) } }), 200);
    const again = await api.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: { until: istToday(30) } });
    expectStatus(again, 200);
    expect(inboxRow(again.data!, key)).toBeUndefined();
  });

  test('snooze until today or a past date is rejected and changes nothing', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-snooze-bad');
    const loan = await loanWithFirstEmiIn(api, 'Snooze Bad Loan', 2);
    const key = emiKey(loan.id);

    for (const until of [istToday(), istToday(-1), istToday(-30)]) {
      const res = await api.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: { until } });
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    }
    expect(inboxRow(await getInbox(api), key), 'still listed').toBeTruthy();

    const missing = await api.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: {} as never });
    expectStatus(missing, 400);
  });

  test('the gmail-attention summary key cannot be snoozed but can be dismissed', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-summary-key');
    const snooze = await api.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key: 'gmail-attention' } }, body: { until: istToday(2) } });
    expectStatus(snooze, 400);
    const dismiss = await api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key: 'gmail-attention' } } });
    expectStatus(dismiss, 200);
  });

  test('dismiss hides an item row, is idempotent, and undo restores it', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-dismiss');
    const loan = await loanWithFirstEmiIn(api, 'Dismiss Loan', 4);
    const key = emiKey(loan.id);

    const first = await api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } });
    expectStatus(first, 200);
    expect(inboxRow(first.data!, key)).toBeUndefined();
    const second = await api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } });
    expectStatus(second, 200);
    expect(inboxRow(second.data!, key)).toBeUndefined();

    const restored = await api.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key } } });
    expect(inboxRow(restored.data!, key)).toBeTruthy();
  });

  test('one undo clears both a snooze and a dismissal on the same key', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-both');
    const loan = await loanWithFirstEmiIn(api, 'Both Loan', 4);
    const key = emiKey(loan.id);
    await api.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: { until: istToday(5) } });
    await api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } });
    expect(inboxRow(await getInbox(api), key)).toBeUndefined();

    const restored = await api.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key } } });
    expectStatus(restored, 200);
    expect(inboxRow(restored.data!, key)).toBeTruthy();
  });

  test('undo on a key with no state is a harmless no-op', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-noop');
    const res = await api.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key: 'emi:00000000-0000-0000-0000-000000000000:1' } } });
    expectStatus(res, 200);
    expect(res.data!.items).toEqual([]);
  });

  test('a dismissed bill stays hidden after it changes, and a new bill is a new key', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-dismiss-bill');
    const card = await createCreditCard(api, { name: 'Dismiss Card', last4: '8107' });
    const bill = await ingestCardStatement(api, card.id, '8107');
    await setBillDue(api, bill.statementId!, istToday(3));
    const key = `bill:${bill.statementId}`;
    expectStatus(await api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } }), 200);
    await setBillDue(api, bill.statementId!, istToday(1));
    expect(inboxRow(await getInbox(api), key)).toBeUndefined();
  });

  test('malformed keys are rejected: whitespace and over-long', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-keys');
    for (const key of ['has space', 'x'.repeat(201)]) {
      const dismiss = await api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } });
      expectStatus(dismiss, 400);
      expect(dismiss.error?.code).toBe('VALIDATION_ERROR');
      expectStatus(await api.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key } } }), 400);
      expectStatus(await api.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: { until: shiftDate(istToday(), 2) } }), 400);
    }
    const ok = await api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key: 'x'.repeat(200) } } });
    expectStatus(ok, 200);
  });
});

test.describe('Inbox API: tenancy and authentication (@api)', () => {
  test('rows and state are per user', async ({ request }) => {
    const a = await newUser(request, 'inbox-a');
    const b = await newUser(request, 'inbox-b');
    const loan = await loanWithFirstEmiIn(a.api, 'Tenancy Loan', 2);
    const key = emiKey(loan.id);

    expect(inboxRow(await getInbox(b.api), key), "B never sees A's row").toBeUndefined();

    // B writing state on A's key only creates B's own state; A's row is untouched.
    expectStatus(await b.api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } }), 200);
    expect(inboxRow(await getInbox(a.api), key), "B's dismissal does not hide A's row").toBeTruthy();

    // And A's dismissal does not leak into B's state.
    expectStatus(await a.api.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } }), 200);
    expect(inboxRow(await getInbox(a.api), key)).toBeUndefined();
    expectStatus(await b.api.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key } } }), 200);
    expect(inboxRow(await getInbox(a.api), key), "B's undo does not restore A's row").toBeUndefined();
  });

  test('every inbox endpoint requires a session', async () => {
    await expectUnauthenticated('GET', '/api/v1/inbox');
    await expectUnauthenticated('GET', '/api/v1/inbox/summary');
    await expectUnauthenticated('POST', '/api/v1/inbox/review/dismiss');
    await expectUnauthenticated('POST', '/api/v1/inbox/review/snooze', { until: istToday(2) });
    await expectUnauthenticated('DELETE', '/api/v1/inbox/review/state');
  });
});
